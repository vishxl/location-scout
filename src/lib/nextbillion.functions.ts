import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { resolveBusinessConfig } from "./business-types";
import type { LocationAnalysis, RoutedPlace, IsochroneResult } from "./nextbillion/types";

const latLng = z.object({ lat: z.number(), lng: z.number() });

export const getNextbillionStatus = createServerFn({ method: "GET" }).handler(async () => {
  const nb = await import("./nextbillion/client.server");
  return { configured: nb.isConfigured() };
});

export const analyzeLocation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        address: z.string().min(2),
        businessTypeId: z.string(),
        customLabel: z.string().optional(),
        mode: z.string().default("car"),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<LocationAnalysis> => {
    const nb = await import("./nextbillion/client.server");
    if (!nb.isConfigured()) throw new Error("NEXTBILLION_API_KEY_MISSING");

    const config = resolveBusinessConfig(data.businessTypeId, data.customLabel);

    const geo = await nb.geocode(data.address);
    if (!geo) throw new Error("ADDRESS_NOT_RESOLVED");
    const at = { lat: geo.lat, lng: geo.lng };

    const routeTop = async (
      places: Awaited<ReturnType<typeof nb.searchPlaces>>,
      routeCount: number,
    ): Promise<RoutedPlace[]> => {
      const withCrow = places
        .map((p) => ({ ...p, crowMeters: nb.haversineMeters(at, { lat: p.lat, lng: p.lng }) }))
        .sort((a, b) => a.crowMeters - b.crowMeters);

      const routed = await Promise.all(
        withCrow.slice(0, routeCount).map(async (p) => {
          try {
            const r = await nb.getDirections({ origin: at, destination: { lat: p.lat, lng: p.lng }, mode: data.mode });
            return {
              ...p,
              routeMeters: r?.distanceMeters ?? null,
              routeSeconds: r?.durationSeconds ?? null,
            } satisfies RoutedPlace;
          } catch {
            return { ...p, routeMeters: null, routeSeconds: null } satisfies RoutedPlace;
          }
        }),
      );
      const rest = withCrow.slice(routeCount).map((p) => ({ ...p, routeMeters: null, routeSeconds: null }));
      return [...routed, ...rest];
    };

    const [competitorRaw, ...categoryRaw] = await Promise.all([
      nb.searchPlaces({ query: config.competitorQuery, at, limit: 40, radiusMeters: 3000 }),
      ...config.categories.map((c) =>
        nb.searchPlaces({ query: c.query, at, limit: 20, radiusMeters: 3000 }).catch(() => []),
      ),
    ]);

    const competitors = await routeTop(competitorRaw, 10);
    const categories = await Promise.all(
      config.categories.map(async (c, i) => ({
        id: c.id,
        label: c.label,
        tone: c.tone,
        places: await routeTop(categoryRaw[i] ?? [], 5),
      })),
    );

    const allRelevant = categories.flatMap((c) => c.places);
    const within = (list: RoutedPlace[], m: number) => list.filter((p) => p.crowMeters <= m).length;

    return {
      location: geo,
      businessLabel: config.label,
      competitors,
      categories,
      stats: {
        relevantTotal: allRelevant.length,
        competitorTotal: competitors.length,
        competitorsWithin1km: within(competitors, 1000),
        competitorsWithin3km: within(competitors, 3000),
        relevantWithin1km: within(allRelevant, 1000),
        relevantWithin3km: within(allRelevant, 3000),
      },
    };
  });

export const fetchIsochrone = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ at: latLng, minutes: z.number(), mode: z.string().default("car") }).parse(input),
  )
  .handler(async ({ data }): Promise<IsochroneResult> => {
    const nb = await import("./nextbillion/client.server");
    if (!nb.isConfigured()) throw new Error("NEXTBILLION_API_KEY_MISSING");
    return nb.getIsochrone({ at: data.at, minutes: data.minutes, mode: data.mode });
  });

export const fetchCompetitorIsochrones = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        points: z.array(latLng).max(8),
        minutes: z.number(),
        mode: z.string().default("car"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const nb = await import("./nextbillion/client.server");
    if (!nb.isConfigured()) throw new Error("NEXTBILLION_API_KEY_MISSING");
    const results = await Promise.all(
      data.points.map((p) =>
        nb
          .getIsochrone({ at: p, minutes: data.minutes, mode: data.mode })
          .then((r) => r.geometry)
          .catch(() => null),
      ),
    );
    return { geometries: results.filter((g): g is NonNullable<typeof g> => g !== null) };
  });
