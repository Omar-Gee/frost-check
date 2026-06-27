export interface NlCity {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

export const NL_CITIES: NlCity[] = [
  {
    slug: "arnhem",
    name: "Arnhem",
    lat: 51.9851,
    lng: 5.8987,
    radiusKm: 10,
  },
  {
    slug: "tilburg",
    name: "Tilburg",
    lat: 51.5555,
    lng: 5.0913,
    radiusKm: 10,
  },
  {
    slug: "amsterdam",
    name: "Amsterdam",
    lat: 52.3676,
    lng: 4.9041,
    radiusKm: 12,
  },
  {
    slug: "den-haag",
    name: "Den Haag",
    lat: 52.0705,
    lng: 4.3007,
    radiusKm: 10,
  },
];

export function getCityBySlug(slug: string): NlCity | undefined {
  return NL_CITIES.find((c) => c.slug === slug);
}

export const AMENITY_TYPES = [
  "cafe",
  "restaurant",
  "bar",
  "pub",
  "fast_food",
  "library",
  "cinema",
  "theatre",
  "community_centre",
  "hotel",
  "museum",
  "shop",
] as const;

export type AmenityType = (typeof AMENITY_TYPES)[number];
