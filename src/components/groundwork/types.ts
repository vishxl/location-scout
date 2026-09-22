import type { GeoJsonGeometry, LocationAnalysis } from "@/lib/nextbillion/types";

export type CandidateKey = "A" | "B" | "C";

export type Candidate = {
  key: CandidateKey;
  address: string;
  analysis: LocationAnalysis | null;
  catchment: { minutes: number; mode: string; geometry: GeoJsonGeometry } | null;
  competitorZones: GeoJsonGeometry[];
  loading: boolean;
  error: string | null;
  visible: boolean;
};

export const CANDIDATE_COLORS: Record<CandidateKey, string> = {
  A: "#f5b13d",
  B: "#4fb3e8",
  C: "#8fd97a",
};

export function emptyCandidate(key: CandidateKey, address = ""): Candidate {
  return {
    key,
    address,
    analysis: null,
    catchment: null,
    competitorZones: [],
    loading: false,
    error: null,
    visible: true,
  };
}
