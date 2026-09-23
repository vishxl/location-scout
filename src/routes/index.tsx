import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Play, Plus, Columns3, FileText, KeyRound } from "lucide-react";

import {
  analyzeLocation,
  fetchCompetitorIsochrones,
  fetchIsochrone,
  getNextbillionStatus,
} from "@/lib/nextbillion.functions";
import { BUSINESS_TYPES, TONE_COLORS, type TravelMode } from "@/lib/business-types";
import { CANDIDATE_COLORS, emptyCandidate, type Candidate, type CandidateKey } from "@/components/groundwork/types";
import AnalysisPanel from "@/components/groundwork/AnalysisPanel";
import ComparisonTable from "@/components/groundwork/ComparisonTable";
import LocationReport from "@/components/groundwork/LocationReport";
import type { MapMarker, MapPolygon } from "@/components/map/MapView";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MapView = lazy(() => import("@/components/map/MapView"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Groundwork — Location intelligence for site selection" },
      {
        name: "description",
        content:
          "Analyze competitors, nearby places, accessibility and catchment areas around a candidate store location before signing a lease.",
      },
      { property: "og:title", content: "Groundwork — Location intelligence for site selection" },
      {
        property: "og:description",
        content:
          "Understand the geographic environment around a candidate business location: competitors, relevant places, routes and reachable areas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Groundwork,
});

const DEMO_ADDRESS = "Park Street, Kolkata";

function Groundwork() {
  const runAnalyze = useServerFn(analyzeLocation);
  const runIsochrone = useServerFn(fetchIsochrone);
  const runZones = useServerFn(fetchCompetitorIsochrones);
  const status = useServerFn(getNextbillionStatus);

  const configured = useQuery({
    queryKey: ["nb-status"],
    queryFn: () => status({}),
  });

  const [businessTypeId, setBusinessTypeId] = useState("coffee_shop");
  const [customLabel, setCustomLabel] = useState("");
  const [mode, setMode] = useState<TravelMode>("car");
  const [catchmentMinutes, setCatchmentMinutes] = useState(10);
  const [catchmentLoading, setCatchmentLoading] = useState(false);
  const [zonesEnabled, setZonesEnabled] = useState(false);
  const [zonesMinutes, setZonesMinutes] = useState<10 | 15>(10);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [layers, setLayers] = useState<Record<string, boolean>>({ competitors: true });
  const [activeKey, setActiveKey] = useState<CandidateKey>("A");
  const [fitKey, setFitKey] = useState("init");
  const [pickMode, setPickMode] = useState(false);

  const [candidates, setCandidates] = useState<Candidate[]>([emptyCandidate("A", DEMO_ADDRESS)]);
  const active = candidates.find((c) => c.key === activeKey) ?? candidates[0]!;

  const patch = useCallback((key: CandidateKey, next: Partial<Candidate>) => {
    setCandidates((prev) => prev.map((c) => (c.key === key ? { ...c, ...next } : c)));
  }, []);

  const isConfigured = configured.data?.configured ?? false;

  const analyze = useCallback(
    async (key: CandidateKey, coords?: { lat: number; lng: number }) => {
      const cand = candidates.find((c) => c.key === key);
      if (!cand) return;
      if (!coords && !cand.address.trim()) return;
      patch(key, { loading: true, error: null, analysis: null, catchment: null, competitorZones: [] });
      try {
        const result = await runAnalyze({
          data: {
            address: coords ? "" : cand.address.trim(),
            ...(coords ? { coords } : {}),
            businessTypeId,
            customLabel,
            mode,
          },
        });
        patch(key, { loading: false, analysis: result, address: result.location.address || cand.address });
        setLayers((prev) => {
          const next: Record<string, boolean> = { ...prev, competitors: prev["competitors"] ?? true };
          for (const c of result.categories) if (next[c.id] === undefined) next[c.id] = true;
          return next;
        });
        setFitKey(`${key}-${result.location.lat}-${result.location.lng}`);
      } catch (err) {
        const raw = err instanceof Error ? err.message : "Unknown error";
        const message = raw.includes("ADDRESS_NOT_RESOLVED")
          ? "That address could not be resolved. Please refine it — add a city, locality or postcode."
          : raw.includes("NEXTBILLION_API_KEY_MISSING")
            ? "Connect your NextBillion API key to analyze live locations."
            : raw;
        patch(key, { loading: false, error: message });
      }
    },
    [candidates, businessTypeId, customLabel, mode, patch, runAnalyze],
  );

  /* catchment for the active candidate */
  useEffect(() => {
    const cand = candidates.find((c) => c.key === activeKey);
    const loc = cand?.analysis?.location;
    if (!cand || !loc) return;
    if (cand.catchment && cand.catchment.minutes === catchmentMinutes && cand.catchment.mode === mode) return;
    let cancelled = false;
    setCatchmentLoading(true);
    runIsochrone({ data: { at: { lat: loc.lat, lng: loc.lng }, minutes: catchmentMinutes, mode } })
      .then((res) => {
        if (cancelled) return;
        if (res.geometry) patch(cand.key, { catchment: { minutes: catchmentMinutes, mode, geometry: res.geometry } });
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setCatchmentLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, catchmentMinutes, mode, active?.analysis?.location.lat]);

  /* competitor zones */
  useEffect(() => {
    const cand = candidates.find((c) => c.key === activeKey);
    if (!cand?.analysis) return;
    if (!zonesEnabled) {
      if (cand.competitorZones.length) patch(cand.key, { competitorZones: [] });
      return;
    }
    let cancelled = false;
    setZonesLoading(true);
    runZones({
      data: {
        points: cand.analysis.competitors.slice(0, 6).map((c) => ({ lat: c.lat, lng: c.lng })),
        minutes: zonesMinutes,
        mode,
      },
    })
      .then((res) => !cancelled && patch(cand.key, { competitorZones: res.geometries }))
      .catch(() => undefined)
      .finally(() => !cancelled && setZonesLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zonesEnabled, zonesMinutes, activeKey, mode, active?.analysis?.location.lat]);

  const { markers, polygons } = useMemo(() => {
    const m: MapMarker[] = [];
    const p: MapPolygon[] = [];
    for (const cand of candidates) {
      if (!cand.visible || !cand.analysis) continue;
      const color = CANDIDATE_COLORS[cand.key];
      const a = cand.analysis;
      m.push({
        id: `site-${cand.key}`,
        lat: a.location.lat,
        lng: a.location.lng,
        color,
        kind: "site",
        title: `Location ${cand.key} — ${a.location.label}`,
        subtitle: a.location.address,
        detail: `${a.stats.competitorTotal} competitors · ${a.stats.relevantTotal} relevant places`,
      });
      if (layers["competitors"] !== false) {
        for (const c of a.competitors) {
          m.push({
            id: `${cand.key}-comp-${c.id}`,
            lat: c.lat,
            lng: c.lng,
            color: "#e0562f",
            kind: "competitor",
            title: c.name,
            subtitle: c.address,
            detail: `${(c.routeMeters ?? c.crowMeters) / 1000 >= 1 ? ((c.routeMeters ?? c.crowMeters) / 1000).toFixed(2) + " km" : Math.round(c.routeMeters ?? c.crowMeters) + " m"}${
              c.routeSeconds !== null ? ` · ${Math.round(c.routeSeconds / 60)} min` : ""
            }`,
          });
        }
      }
      for (const cat of a.categories) {
        if (layers[cat.id] === false) continue;
        for (const place of cat.places) {
          m.push({
            id: `${cand.key}-${cat.id}-${place.id}`,
            lat: place.lat,
            lng: place.lng,
            color: TONE_COLORS[cat.tone as keyof typeof TONE_COLORS] ?? "#94a3b8",
            kind: "poi",
            title: place.name,
            subtitle: `${cat.label}${place.address ? " · " + place.address : ""}`,
            detail: `${((place.routeMeters ?? place.crowMeters) / 1000).toFixed(2)} km${
              place.routeSeconds !== null ? ` · ${Math.round(place.routeSeconds / 60)} min` : ""
            }`,
          });
        }
      }
      if (cand.catchment) {
        p.push({ id: `catch-${cand.key}`, geometry: cand.catchment.geometry, color, opacity: 0.14 });
      }
      cand.competitorZones.forEach((g, i) =>
        p.push({ id: `zone-${cand.key}-${i}`, geometry: g, color: "#e0562f", opacity: 0.07 }),
      );
    }
    return { markers: m, polygons: p };
  }, [candidates, layers]);

  const center = active?.analysis
    ? { lat: active.analysis.location.lat, lng: active.analysis.location.lng }
    : null;

  const addCandidate = () => {
    const used = candidates.map((c) => c.key);
    const next = (["A", "B", "C"] as CandidateKey[]).find((k) => !used.includes(k));
    if (!next) return;
    setCandidates((prev) => [...prev, emptyCandidate(next)]);
    setActiveKey(next);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[15px] font-semibold tracking-[0.14em] text-primary">GROUNDWORK</span>
          <span className="text-[12px] text-muted-foreground">Understand a location before you commit to it.</span>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger className="flex items-center gap-1.5 border border-border bg-surface px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:border-border-strong hover:text-foreground">
              <Columns3 className="h-3.5 w-3.5" /> Compare
            </DialogTrigger>
            <DialogContent className="max-w-4xl border-border bg-surface">
              <DialogHeader>
                <DialogTitle className="font-mono text-[13px] uppercase tracking-[0.16em]">
                  Compare locations
                </DialogTitle>
              </DialogHeader>
              <ComparisonTable candidates={candidates} />
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger className="flex items-center gap-1.5 border border-border bg-surface px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:border-border-strong hover:text-foreground">
              <FileText className="h-3.5 w-3.5" /> Report
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto border-border bg-surface">
              <DialogHeader>
                <DialogTitle className="font-mono text-[13px] uppercase tracking-[0.16em]">
                  Location report
                </DialogTitle>
              </DialogHeader>
              <LocationReport candidates={candidates} />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* input bar */}
      <div className="flex flex-wrap items-end gap-3 border-b border-border bg-surface px-4 py-2.5">
        <div className="flex flex-col gap-1">
          <label className="label-xs">Business type</label>
          <select
            value={businessTypeId}
            onChange={(e) => setBusinessTypeId(e.target.value)}
            className="h-8 min-w-[150px] border border-border bg-input px-2 text-[12px] text-foreground outline-none focus:border-primary"
          >
            {BUSINESS_TYPES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </div>
        {businessTypeId === "custom" ? (
          <div className="flex flex-col gap-1">
            <label className="label-xs">Custom type</label>
            <input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="e.g. bookstore"
              className="h-8 w-44 border border-border bg-input px-2 text-[12px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
        ) : null}
        <div className="flex min-w-[260px] flex-1 flex-col gap-1">
          <label className="label-xs">Location {active?.key}</label>
          <input
            value={active?.address ?? ""}
            onChange={(e) => patch(active!.key, { address: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && analyze(active!.key)}
            placeholder="Enter address"
            className="h-8 w-full border border-border bg-input px-2 text-[12px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
        <button
          onClick={() => analyze(active!.key)}
          disabled={!isConfigured || active?.loading}
          className="flex h-8 items-center gap-1.5 bg-primary px-3 font-mono text-[11px] uppercase tracking-[0.12em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {active?.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Analyze location
        </button>

        {/* candidate switcher */}
        <div className="flex items-center gap-1">
          {candidates.map((c) => (
            <div key={c.key} className="flex items-center">
              <button
                onClick={() => setActiveKey(c.key)}
                className={cn(
                  "h-8 border px-2.5 font-mono text-[11px]",
                  activeKey === c.key
                    ? "border-border-strong bg-surface-raised text-foreground"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground",
                )}
                style={activeKey === c.key ? { borderBottomColor: CANDIDATE_COLORS[c.key] } : undefined}
              >
                <span style={{ color: CANDIDATE_COLORS[c.key] }}>●</span> {c.key}
              </button>
              <button
                onClick={() => patch(c.key, { visible: !c.visible })}
                title="Toggle on map"
                className={cn(
                  "h-8 border border-l-0 border-border px-1.5 font-mono text-[10px]",
                  c.visible ? "text-foreground" : "text-muted-foreground/50",
                )}
              >
                {c.visible ? "on" : "off"}
              </button>
            </div>
          ))}
          {candidates.length < 3 ? (
            <button
              onClick={addCandidate}
              className="flex h-8 items-center gap-1 border border-dashed border-border px-2 font-mono text-[11px] text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          ) : null}
        </div>
      </div>

      {!configured.isLoading && !isConfigured ? (
        <div className="flex items-center gap-2 border-b border-primary/40 bg-primary/10 px-4 py-2 text-[12px] text-primary">
          <KeyRound className="h-3.5 w-3.5" />
          Connect your NextBillion API key to analyze live locations.
        </div>
      ) : null}

      {/* workspace */}
      <div className="flex min-h-0 flex-1">
        <aside className="w-2/5 min-w-[340px] border-r border-border bg-surface">
          <AnalysisPanel
            candidate={active!}
            mode={mode}
            onModeChange={setMode}
            catchmentMinutes={catchmentMinutes}
            onCatchmentMinutes={setCatchmentMinutes}
            catchmentLoading={catchmentLoading}
            zonesMinutes={zonesMinutes}
            onZonesMinutes={setZonesMinutes}
            zonesEnabled={zonesEnabled}
            onZonesToggle={setZonesEnabled}
            zonesLoading={zonesLoading}
            layers={layers}
            onLayerToggle={(id) => setLayers((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }))}
          />
        </aside>
        <main className="relative min-w-0 flex-1">
          <ClientOnly fallback={<div className="h-full w-full bg-background" />}>
            <Suspense fallback={<div className="h-full w-full bg-background" />}>
              <MapView center={center} markers={markers} polygons={polygons} fitKey={fitKey} />
            </Suspense>
          </ClientOnly>
          <div className="pointer-events-none absolute left-3 top-3 space-y-1 border border-border bg-background/85 px-3 py-2 backdrop-blur">
            <div className="label-xs">Legend</div>
            <LegendRow color={CANDIDATE_COLORS.A} label="Your location" />
            <LegendRow color="#e0562f" label="Competitors" />
            <LegendRow color="#60a5fa" label="Other relevant places" />
          </div>
        </main>
      </div>
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-foreground/90">
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}
