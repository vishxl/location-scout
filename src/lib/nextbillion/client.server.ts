/**
 * Server-side NextBillion.ai client.
 * The API key is read from the environment inside each call and never leaves the server.
 */

const BASE = "https://api.nextbillion.io";

export type GeoJsonGeometry = { type: string; coordinates: unknown };

export type LatLng = { lat: number; lng: number };

export type GeocodeResult = {
  label: string;
  address: string;
  lat: number;
  lng: number;
};

export type PlaceResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export type RouteResult = {
  distanceMeters: number;
  durationSeconds: number;
};

export type IsochroneResult = {
  minutes: number;
  /** GeoJSON polygon geometry */
  geometry: GeoJsonGeometry | null;
};

export function getApiKey(): string | null {
  const key = process.env["NEXTBILLION_API_KEY"];
  return key && key.trim().length > 0 ? key.trim() : null;
}

export function isConfigured(): boolean {
  return getApiKey() !== null;
}

function requireKey(): string {
  const key = getApiKey();
  if (!key) throw new Error("NEXTBILLION_API_KEY is not configured");
  return key;
}

async function nbFetch<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const key = requireKey();
  const url = new URL(path, BASE);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && `${v}`.length > 0) url.searchParams.set(k, `${v}`);
  }
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`NextBillion returned a non-JSON response (${res.status})`);
  }
  if (!res.ok) {
    const msg =
      (json as { message?: string; error?: string })?.message ??
      (json as { error?: string })?.error ??
      `NextBillion request failed (${res.status})`;
    throw new Error(msg);
  }
  return json as T;
}

/* ---------------------------------- geocode --------------------------------- */

type HereLikeItem = {
  title?: string;
  address?: { label?: string };
  position?: { lat: number; lng: number };
  id?: string;
};

export async function geocode(query: string): Promise<GeocodeResult | null> {
  const data = await nbFetch<{ items?: HereLikeItem[] }>("/h/geocode", { q: query, limit: 1 });
  const item = data.items?.[0];
  if (!item?.position) return null;
  return {
    label: item.title ?? query,
    address: item.address?.label ?? item.title ?? query,
    lat: item.position.lat,
    lng: item.position.lng,
  };
}

export async function reverseGeocode(at: LatLng): Promise<GeocodeResult | null> {
  const data = await nbFetch<{ items?: HereLikeItem[] }>("/h/revgeocode", {
    at: `${at.lat},${at.lng}`,
  });
  const item = data.items?.[0];
  if (!item?.position) return null;
  return {
    label: item.title ?? "Selected point",
    address: item.address?.label ?? item.title ?? "",
    lat: item.position.lat,
    lng: item.position.lng,
  };
}

/* --------------------------------- places ---------------------------------- */

export async function searchPlaces(opts: {
  query: string;
  at: LatLng;
  limit?: number;
  radiusMeters?: number;
}): Promise<PlaceResult[]> {
  const data = await nbFetch<{ items?: HereLikeItem[] }>("/h/discover", {
    q: opts.query,
    at: `${opts.at.lat},${opts.at.lng}`,
    limit: opts.limit ?? 20,
    in: opts.radiusMeters ? `circle:${opts.at.lat},${opts.at.lng};r=${opts.radiusMeters}` : undefined,
  });
  return (data.items ?? [])
    .filter((i) => i.position)
    .map((i, idx) => ({
      id: i.id ?? `${opts.query}-${idx}`,
      name: i.title ?? "Unnamed place",
      address: i.address?.label ?? "",
      lat: i.position!.lat,
      lng: i.position!.lng,
    }));
}

/* -------------------------------- directions -------------------------------- */

export async function getDirections(opts: {
  origin: LatLng;
  destination: LatLng;
  mode?: string;
}): Promise<RouteResult | null> {
  const data = await nbFetch<{
    routes?: Array<{ distance?: number; duration?: number }>;
    distance?: number;
    duration?: number;
  }>("/directions/json", {
    origin: `${opts.origin.lat},${opts.origin.lng}`,
    destination: `${opts.destination.lat},${opts.destination.lng}`,
    mode: opts.mode ?? "car",
    altcount: 0,
  });
  const r = data.routes?.[0];
  const distance = r?.distance ?? data.distance;
  const duration = r?.duration ?? data.duration;
  if (typeof distance !== "number" || typeof duration !== "number") return null;
  return { distanceMeters: distance, durationSeconds: duration };
}

/* --------------------------------- isochrone -------------------------------- */

export async function getIsochrone(opts: {
  at: LatLng;
  minutes: number;
  mode?: string;
}): Promise<IsochroneResult> {
  const data = await nbFetch<{
    features?: Array<{ geometry?: GeoJsonGeometry }>;
    polygons?: Array<{ geometry?: GeoJsonGeometry }>;
  }>("/isochrone/json", {
    coordinates: `${opts.at.lat},${opts.at.lng}`,
    contours_minutes: opts.minutes,
    mode: opts.mode ?? "car",
    polygons: "true",
digits: 6,
  });
  const geometry = data.features?.[0]?.geometry ?? data.polygons?.[0]?.geometry ?? null;
  return { minutes: opts.minutes, geometry };
}

/* --------------------------------- helpers ---------------------------------- */

export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
