export type GeoJsonGeometry = { type: string; coordinates: unknown };

export type LatLng = { lat: number; lng: number };

export type GeocodeResult = {
  label: string;
  address: string;
  lat: number;
  lng: number;
};

export type RoutedPlace = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** straight-line fallback, always present */
  crowMeters: number;
  /** route distance in meters, when the directions API returned one */
  routeMeters: number | null;
  routeSeconds: number | null;
};

export type CategoryResult = {
  id: string;
  label: string;
  tone: string;
  places: RoutedPlace[];
};

export type LocationAnalysis = {
  location: GeocodeResult;
  businessLabel: string;
  competitors: RoutedPlace[];
  categories: CategoryResult[];
  stats: {
    relevantTotal: number;
    competitorTotal: number;
    competitorsWithin1km: number;
    competitorsWithin3km: number;
    relevantWithin1km: number;
    relevantWithin3km: number;
  };
};

export type IsochroneResult = {
  minutes: number;
  geometry: GeoJsonGeometry | null;
};
