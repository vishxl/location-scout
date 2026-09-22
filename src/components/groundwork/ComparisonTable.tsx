import type { Candidate } from "./types";
import { CANDIDATE_COLORS } from "./types";
import { averageRouteMeters, fmtDistance, fmtDuration } from "@/lib/format";

type Row = { metric: string; values: (c: Candidate) => string };

const ROWS: Row[] = [
  { metric: "Address", values: (c) => c.analysis?.location.address ?? "—" },
  { metric: "Competitors identified", values: (c) => (c.analysis ? String(c.analysis.stats.competitorTotal) : "—") },
  {
    metric: "Competitors within 1 km",
    values: (c) => (c.analysis ? String(c.analysis.stats.competitorsWithin1km) : "—"),
  },
  {
    metric: "Competitors within 3 km",
    values: (c) => (c.analysis ? String(c.analysis.stats.competitorsWithin3km) : "—"),
  },
  {
    metric: "Nearest competitor (route)",
    values: (c) => {
      const n = c.analysis?.competitors[0];
      return n ? fmtDistance(n.routeMeters ?? n.crowMeters) : "—";
    },
  },
  {
    metric: "Nearest competitor (time)",
    values: (c) => fmtDuration(c.analysis?.competitors[0]?.routeSeconds ?? null),
  },
  {
    metric: "Avg route distance to competitors",
    values: (c) => fmtDistance(c.analysis ? averageRouteMeters(c.analysis.competitors) : null),
  },
  {
    metric: "Relevant POIs within 1 km",
    values: (c) => (c.analysis ? String(c.analysis.stats.relevantWithin1km) : "—"),
  },
  {
    metric: "Relevant POIs within 3 km",
    values: (c) => (c.analysis ? String(c.analysis.stats.relevantWithin3km) : "—"),
  },
  {
    metric: "Catchment computed",
    values: (c) => (c.catchment ? `${c.catchment.minutes} min · ${c.catchment.mode}` : "—"),
  },
];

export default function ComparisonTable({ candidates }: { candidates: Candidate[] }) {
  const active = candidates.filter((c) => c.analysis);
  if (active.length === 0) {
    return <p className="text-[12px] text-muted-foreground">Analyze at least one candidate location to compare.</p>;
  }

  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-surface-raised">
            <th className="label-xs border-b border-r border-border px-3 py-2 text-left">Metric</th>
            {active.map((c) => (
              <th key={c.key} className="border-b border-r border-border px-3 py-2 text-left">
                <span className="num text-[12px]" style={{ color: CANDIDATE_COLORS[c.key] }}>
                  Location {c.key}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.metric} className="odd:bg-surface/40">
              <td className="border-b border-r border-border px-3 py-2 text-muted-foreground">{row.metric}</td>
              {active.map((c) => (
                <td key={c.key} className="num border-b border-r border-border px-3 py-2 text-foreground">
                  {row.values(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-[11px] text-muted-foreground">
        Figures are counts and routed measurements returned by NextBillion for each candidate. No ranking or
        performance prediction is implied.
      </p>
    </div>
  );
}
