/**
 * Configuration object mapping business types to the search terms used for
 * competitor detection and for the surrounding "relevant ecosystem".
 * Extend by adding entries here — nothing else needs to change.
 */

export type PlaceCategory = {
  /** stable id, used for layer toggles */
  id: string;
  /** label shown in the UI */
  label: string;
  /** query sent to the NextBillion places search */
  query: string;
  /** hex-ish token name for map colouring */
  tone: "hotel" | "office" | "education" | "shopping" | "transit" | "health" | "food" | "misc";
};

export type BusinessTypeConfig = {
  id: string;
  label: string;
  /** what counts as a direct competitor */
  competitorQuery: string;
  categories: PlaceCategory[];
};

const C = (id: string, label: string, query: string, tone: PlaceCategory["tone"]): PlaceCategory => ({
  id,
  label,
  query,
  tone,
});

export const BUSINESS_TYPES: BusinessTypeConfig[] = [
  {
    id: "coffee_shop",
    label: "Coffee Shop",
    competitorQuery: "coffee shop cafe",
    categories: [
      C("restaurants", "Restaurants", "restaurant", "food"),
      C("hotels", "Hotels", "hotel", "hotel"),
      C("offices", "Offices", "office", "office"),
      C("universities", "Universities", "university college", "education"),
      C("shopping", "Shopping", "shopping mall", "shopping"),
      C("transit", "Transit", "metro station bus station", "transit"),
    ],
  },
  {
    id: "restaurant",
    label: "Restaurant",
    competitorQuery: "restaurant",
    categories: [
      C("hotels", "Hotels", "hotel", "hotel"),
      C("offices", "Offices", "office", "office"),
      C("shopping", "Shopping", "shopping mall", "shopping"),
      C("attractions", "Attractions", "tourist attraction", "misc"),
      C("transit", "Transit", "metro station bus station", "transit"),
    ],
  },
  {
    id: "pharmacy",
    label: "Pharmacy",
    competitorQuery: "pharmacy chemist",
    categories: [
      C("hospitals", "Hospitals", "hospital", "health"),
      C("clinics", "Clinics", "clinic", "health"),
      C("diagnostics", "Diagnostic centres", "diagnostic centre pathology lab", "health"),
      C("residential", "Residential", "residential apartments", "misc"),
      C("supermarkets", "Supermarkets", "supermarket", "shopping"),
    ],
  },
  {
    id: "salon",
    label: "Salon",
    competitorQuery: "salon hair beauty",
    categories: [
      C("shopping", "Shopping", "shopping mall", "shopping"),
      C("gyms", "Gyms", "gym fitness", "misc"),
      C("residential", "Residential", "residential apartments", "misc"),
      C("hotels", "Hotels", "hotel", "hotel"),
      C("transit", "Transit", "metro station bus station", "transit"),
    ],
  },
  {
    id: "grocery",
    label: "Grocery",
    competitorQuery: "grocery store supermarket",
    categories: [
      C("residential", "Residential", "residential apartments", "misc"),
      C("schools", "Schools", "school", "education"),
      C("transit", "Transit", "metro station bus station", "transit"),
      C("pharmacies", "Pharmacies", "pharmacy", "health"),
      C("restaurants", "Restaurants", "restaurant", "food"),
    ],
  },
  {
    id: "gym",
    label: "Gym",
    competitorQuery: "gym fitness centre",
    categories: [
      C("residential", "Residential", "residential apartments", "misc"),
      C("offices", "Offices", "office", "office"),
      C("universities", "Universities", "university college", "education"),
      C("parks", "Parks", "park", "misc"),
      C("transit", "Transit", "metro station bus station", "transit"),
    ],
  },
  {
    id: "clinic",
    label: "Clinic",
    competitorQuery: "clinic doctor",
    categories: [
      C("hospitals", "Hospitals", "hospital", "health"),
      C("pharmacies", "Pharmacies", "pharmacy", "health"),
      C("diagnostics", "Diagnostic centres", "diagnostic centre pathology lab", "health"),
      C("residential", "Residential", "residential apartments", "misc"),
      C("transit", "Transit", "metro station bus station", "transit"),
    ],
  },
  {
    id: "retail",
    label: "Retail",
    competitorQuery: "clothing store retail shop",
    categories: [
      C("shopping", "Shopping", "shopping mall", "shopping"),
      C("restaurants", "Restaurants", "restaurant", "food"),
      C("offices", "Offices", "office", "office"),
      C("transit", "Transit", "metro station bus station", "transit"),
      C("hotels", "Hotels", "hotel", "hotel"),
    ],
  },
  {
    id: "hotel",
    label: "Hotel",
    competitorQuery: "hotel",
    categories: [
      C("attractions", "Attractions", "tourist attraction", "misc"),
      C("restaurants", "Restaurants", "restaurant", "food"),
      C("transit", "Transit", "railway station airport metro", "transit"),
      C("offices", "Offices", "office", "office"),
      C("shopping", "Shopping", "shopping mall", "shopping"),
    ],
  },
];

export const DEFAULT_CATEGORIES: PlaceCategory[] = [
  C("restaurants", "Restaurants", "restaurant", "food"),
  C("shopping", "Shopping", "shopping mall", "shopping"),
  C("offices", "Offices", "office", "office"),
  C("transit", "Transit", "metro station bus station", "transit"),
  C("residential", "Residential", "residential apartments", "misc"),
];

export function resolveBusinessConfig(idOrCustom: string, customLabel?: string): BusinessTypeConfig {
  const found = BUSINESS_TYPES.find((b) => b.id === idOrCustom);
  if (found) return found;
  const label = customLabel?.trim() || "Custom";
  return {
    id: "custom",
    label,
    competitorQuery: label,
    categories: DEFAULT_CATEGORIES,
  };
}

export const TONE_COLORS: Record<PlaceCategory["tone"], string> = {
  hotel: "#c084fc",
  office: "#60a5fa",
  education: "#34d399",
  shopping: "#fbbf24",
  transit: "#38bdf8",
  health: "#f472b6",
  food: "#fb923c",
  misc: "#94a3b8",
};

export const TRAVEL_MODES = [
  { id: "car", label: "Driving" },
  { id: "motorcycle", label: "Motorcycle" },
  { id: "walking", label: "Walking" },
  { id: "bicycle", label: "Cycling" },
] as const;

export type TravelMode = (typeof TRAVEL_MODES)[number]["id"];
