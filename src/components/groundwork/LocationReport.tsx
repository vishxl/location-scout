import type { Candidate } from "./types";
import { CANDIDATE_COLORS } from "./types";
import ComparisonTable from "./ComparisonTable";
import { averageRouteMeters, fmtCoord, fmtDistance, fmtDuration } from "@/lib/format";

export default function LocationReport({ candidates }: { candidates: Candidate[] }) {
  const analyzed = candidates.filter((c) => c.analysis);

  if (analyzed.length === 0) {
    return <p className="text-[12px] text-muted-foreground">Run an analysis first to generate a report.</p>;
  }

  return (
    <div className="space-y-8 text-[12px] leading-relaxed">
      {analyzed.map((c) => {
        const a = c.analysis!;
        const nearest = a.competitors[0];
        return (
          <section key={c.key} className="space-y-3">
            <header className="border-b border-border pb-2">
              <div className="num text-[11px]" style={{ color: CANDIDATE_COLORS[c.key] }}>
                LOCATION {c.key}
              </div>
              <h3 className="text-[15px] font-medium text-foreground">{a.location.label}</h3>
              <div className="text-muted-foreground">{a.location.address}</div>
              <div className="num text-[11px] text-muted-foreground">
                {fmtCoord(a.location.lat)}, {fmtCoord(a.location.lng)} · business type: {a.businessLabel}
              </div>
            </header>

            <div>
              <div className="label-xs mb-1">Competition</div>
              <p className="text-foreground/90">
                {a.stats.competitorTotal} businesses matching “{a.businessLabel}” were identified within
                approximately 3 km, of which {a.stats.competitorsWithin1km} are within about 1 km.
                {nearest
                  ? ` The nearest is ${nearest.name} at ${fmtDistance(nearest.routeMeters ?? nearest.crowMeters)}${
                      nearest.routeSeconds !== null ? ` (${fmtDuration(nearest.routeSeconds)} by route)` : ""
                    }.`
                  : " No matching competitor was returned in this radius."}
                {averageRouteMeters(a.competitors) !== null
                  ? ` Average routed distance to the closest competitors is ${fmtDistance(averageRouteMeters(a.competitors))}.`
                  : ""}
              </p>
            </div>

            <div>
              <div className="label-xs mb-1">Relevant nearby places</div>
              <ul className="space-y-0.5">
                {a.categories.map((cat) => (
                  <li key={cat.id} className="flex justify-between border-b border-border/60 py-1">
                    <span className="text-foreground/90">{cat.label}</span>
                    <span className="num text-muted-foreground">
                      {cat.places.length} found · nearest{" "}
                      {cat.places[0] ? fmtDistance(cat.places[0].routeMeters ?? cat.places[0].crowMeters) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="label-xs mb-1">Accessibility</div>
              <ul className="space-y-0.5">
                {a.categories.flatMap((cat) =>
                  cat.places.slice(0, 3).map((p) => (
                    <li key={`${cat.id}-${p.id}`} className="flex justify-between border-b border-border/60 py-1">
                      <span className="truncate text-foreground/90">
                        <span className="text-muted-foreground">{cat.label}: </span>
                        {p.name}
                      </span>
                      <span className="num shrink-0 pl-3 text-muted-foreground">
                        {fmtDistance(p.routeMeters ?? p.crowMeters)} · {fmtDuration(p.routeSeconds)}
                      </span>
                    </li>
                  )),
                )}
              </ul>
            </div>

            <div>
              <div className="label-xs mb-1">Catchment</div>
              <p className="text-foreground/90">
                {c.catchment
                  ? `A ${c.catchment.minutes}-minute reachable area (${c.catchment.mode}) was computed from this location and is displayed on the map.`
                  : "No catchment area has been computed for this location yet."}
              </p>
            </div>

            <div>
              <div className="label-xs mb-1">Nearby competitor locations</div>
              <ul className="space-y-0.5">
                {a.competitors.slice(0, 10).map((p) => (
                  <li key={p.id} className="flex justify-between border-b border-border/60 py-1">
                    <span className="truncate text-foreground/90">{p.name}</span>
                    <span className="num shrink-0 pl-3 text-muted-foreground">
                      {fmtDistance(p.routeMeters ?? p.crowMeters)} · {fmtDuration(p.routeSeconds)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );
      })}

      {analyzed.length > 1 ? (
        <section className="space-y-2">
          <div className="label-xs">Comparison with other candidates</div>
          <ComparisonTable candidates={analyzed} />
        </section>
      ) : null}

      <p className="border-t border-border pt-3 text-[11px] text-muted-foreground">
        All figures come from NextBillion.ai geocoding, places, directions and isochrone responses at the time
        of analysis. This report contains no estimates of revenue, footfall, population or business performance.
      </p>
    </div>
  );
}
