import { useState } from "react";
import { Loader2, MapPin, AlertTriangle } from "lucide-react";
import type { Candidate } from "./types";
import type { RoutedPlace } from "@/lib/nextbillion/types";
import { TRAVEL_MODES, type TravelMode } from "@/lib/business-types";
import { averageRouteMeters, fmtCoord, fmtDistance, fmtDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

const MINUTE_OPTIONS = [5, 10, 15, 20];

type Props = {
  candidate: Candidate;
  mode: TravelMode;
  onModeChange: (m: TravelMode) => void;
  catchmentMinutes: number;
  onCatchmentMinutes: (m: number) => void;
  catchmentLoading: boolean;
  zonesMinutes: 10 | 15;
  onZonesMinutes: (m: 10 | 15) => void;
  zonesEnabled: boolean;
  onZonesToggle: (v: boolean) => void;
  zonesLoading: boolean;
  layers: Record<string, boolean>;
  onLayerToggle: (id: string) => void;
};

function SectionTitle({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border px-4 py-2">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">{children}</h2>
      {note ? <span className="label-xs">{note}</span> : null}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border-b border-r border-border px-4 py-3">
      <div className="label-xs">{label}</div>
      <div className="num mt-1 text-lg leading-none text-foreground">{value}</div>
      {sub ? <div className="mt-1 truncate text-[11px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

function PlaceRow({ place, accent }: { place: RoutedPlace; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-2 hover:bg-surface-raised">
      <div className="min-w-0">
        <div className={cn("truncate text-[12px]", accent ? "text-foreground" : "text-foreground/90")}>
          {place.name}
        </div>
        {place.address ? (
          <div className="truncate text-[11px] text-muted-foreground">{place.address}</div>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <div className="num text-[12px] text-foreground">
          {fmtDistance(place.routeMeters ?? place.crowMeters)}
        </div>
        <div className="num text-[10px] text-muted-foreground">
          {place.routeSeconds !== null ? fmtDuration(place.routeSeconds) : "route n/a"}
        </div>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "num rounded-sm border px-2 py-1 text-[11px] transition-colors",
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export default function AnalysisPanel(props: Props) {
  const { candidate } = props;
  const [accessLimit, setAccessLimit] = useState<1 | 5 | 10>(5);

  if (candidate.loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em]">Analyzing location…</span>
      </div>
    );
  }

  if (candidate.error) {
    return (
      <div className="flex h-full items-start justify-center p-8">
        <div className="max-w-sm border border-destructive/40 bg-destructive/10 p-4">
          <div className="mb-1 flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em]">Analysis failed</span>
          </div>
          <p className="text-[12px] text-foreground/90">{candidate.error}</p>
        </div>
      </div>
    );
  }

  const a = candidate.analysis;
  if (!a) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
        <MapPin className="h-5 w-5 text-muted-foreground" />
        <p className="max-w-xs text-[12px] text-muted-foreground">
          Enter a business type and a candidate address, then run the analysis to see the geographic
          environment around location {candidate.key}.
        </p>
      </div>
    );
  }

  const competitors = a.competitors;
  const nearestCompetitor = competitors[0] ?? null;
  const allRelevant = a.categories.flatMap((c) => c.places).sort((x, y) => x.crowMeters - y.crowMeters);
  const nearestRelevant = allRelevant[0] ?? null;
  const avgCompetitorRoute = averageRouteMeters(competitors);

  return (
    <div className="panel-scroll h-full overflow-y-auto">
      {/* snapshot */}
      <SectionTitle note={a.businessLabel}>Location Snapshot</SectionTitle>
      <div className="border-b border-border px-4 py-3">
        <div className="text-[13px] text-foreground">{a.location.label}</div>
        <div className="text-[11px] text-muted-foreground">{a.location.address}</div>
        <div className="num mt-1 text-[11px] text-muted-foreground">
          {fmtCoord(a.location.lat)}, {fmtCoord(a.location.lng)}
        </div>
      </div>
      <div className="grid grid-cols-2 border-b border-border">
        <Stat label="Relevant businesses nearby" value={String(a.stats.relevantTotal)} />
        <Stat label="Direct competitors" value={String(a.stats.competitorTotal)} />
        <Stat
          label="Nearest competitor"
          value={nearestCompetitor ? fmtDistance(nearestCompetitor.routeMeters ?? nearestCompetitor.crowMeters) : "—"}
          sub={nearestCompetitor?.name}
        />
        <Stat
          label="Nearest relevant POI"
          value={nearestRelevant ? fmtDistance(nearestRelevant.routeMeters ?? nearestRelevant.crowMeters) : "—"}
          sub={nearestRelevant?.name}
        />
        <Stat label="Relevant places within 1 km" value={String(a.stats.relevantWithin1km)} />
        <Stat label="Relevant places within 3 km" value={String(a.stats.relevantWithin3km)} />
      </div>

      {/* competition */}
      <SectionTitle note={`${a.stats.competitorsWithin1km} within 1 km · ${a.stats.competitorsWithin3km} within 3 km`}>
        Competition
      </SectionTitle>
      <div className="grid grid-cols-2 border-b border-border">
        <Stat label="Competitor count" value={String(competitors.length)} />
        <Stat
          label="Nearest competitor travel time"
          value={nearestCompetitor ? fmtDuration(nearestCompetitor.routeSeconds) : "—"}
        />
        <Stat label="Avg route distance to competitors" value={fmtDistance(avgCompetitorRoute)} sub="routed subset" />
        <Stat
          label="Competitors within 1 km"
          value={String(a.stats.competitorsWithin1km)}
        />
      </div>
      <div>
        {competitors.slice(0, 12).map((c) => (
          <PlaceRow key={c.id} place={c} accent />
        ))}
        {competitors.length === 0 ? (
          <div className="px-4 py-3 text-[12px] text-muted-foreground">
            No matching competitors returned within 3 km.
          </div>
        ) : null}
      </div>

      {/* competition zones */}
      <SectionTitle note="reachable areas">Competition zones</SectionTitle>
      <div className="space-y-2 border-b border-border px-4 py-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Draw reachable areas around the nearest competitors to see how much of the same geographic market
          is already served.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={props.zonesEnabled} onClick={() => props.onZonesToggle(!props.zonesEnabled)}>
            {props.zonesLoading ? "loading…" : props.zonesEnabled ? "zones on" : "zones off"}
          </Chip>
          <Chip active={props.zonesMinutes === 10} onClick={() => props.onZonesMinutes(10)}>
            10 min
          </Chip>
          <Chip active={props.zonesMinutes === 15} onClick={() => props.onZonesMinutes(15)}>
            15 min
          </Chip>
        </div>
      </div>

      {/* catchment */}
      <SectionTitle note={candidate.catchment ? `${candidate.catchment.minutes} min` : "—"}>Catchment</SectionTitle>
      <div className="space-y-3 border-b border-border px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {MINUTE_OPTIONS.map((m) => (
            <Chip key={m} active={props.catchmentMinutes === m} onClick={() => props.onCatchmentMinutes(m)}>
              {m} min
            </Chip>
          ))}
          {props.catchmentLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {TRAVEL_MODES.map((m) => (
            <Chip key={m.id} active={props.mode === m.id} onClick={() => props.onModeChange(m.id)}>
              {m.label}
            </Chip>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {candidate.catchment
            ? "The shaded polygon shows where customers can reach this location within the selected time."
            : "Select a time band to request the reachable area for this location."}
        </p>
      </div>

      {/* accessibility */}
      <SectionTitle note="route distance & time">Accessibility</SectionTitle>
      <div className="flex gap-2 border-b border-border px-4 py-3">
        {([1, 5, 10] as const).map((n) => (
          <Chip key={n} active={accessLimit === n} onClick={() => setAccessLimit(n)}>
            {n === 1 ? "nearest" : `${n} closest`}
          </Chip>
        ))}
      </div>
      {a.categories.map((cat) => (
        <div key={cat.id}>
          <div className="flex items-center justify-between bg-surface-raised/60 px-4 py-1.5">
            <span className="label-xs">{cat.label}</span>
            <span className="num text-[10px] text-muted-foreground">{cat.places.length}</span>
          </div>
          {cat.places.slice(0, accessLimit).map((p) => (
            <PlaceRow key={p.id} place={p} />
          ))}
          {cat.places.length === 0 ? (
            <div className="px-4 py-2 text-[11px] text-muted-foreground">No results returned.</div>
          ) : null}
        </div>
      ))}

      {/* layers */}
      <SectionTitle>Map layers</SectionTitle>
      <div className="flex flex-wrap gap-2 px-4 py-3 pb-8">
        <Chip active={props.layers["competitors"] ?? true} onClick={() => props.onLayerToggle("competitors")}>
          Competitors
        </Chip>
        {a.categories.map((c) => (
          <Chip key={c.id} active={props.layers[c.id] ?? true} onClick={() => props.onLayerToggle(c.id)}>
            {c.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}
