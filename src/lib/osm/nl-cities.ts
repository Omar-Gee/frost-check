export interface NlCity {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
  /** Used for Google Maps search queries */
  country: string;
}

export const NL_CITIES: NlCity[] = [
  {
    slug: "arnhem",
    name: "Arnhem",
    lat: 51.9851,
    lng: 5.8987,
    radiusKm: 10,
    country: "Netherlands",
  },
  {
    slug: "tilburg",
    name: "Tilburg",
    lat: 51.5555,
    lng: 5.0913,
    radiusKm: 10,
    country: "Netherlands",
  },
  {
    slug: "amsterdam",
    name: "Amsterdam",
    lat: 52.3676,
    lng: 4.9041,
    radiusKm: 12,
    country: "Netherlands",
  },
  {
    slug: "den-haag",
    name: "Den Haag",
    lat: 52.0705,
    lng: 4.3007,
    radiusKm: 10,
    country: "Netherlands",
  },
  {
    slug: "brussels",
    name: "Brussels",
    lat: 50.8503,
    lng: 4.3517,
    radiusKm: 10,
    country: "Belgium",
  },
];

export function getCityBySlug(slug: string): NlCity | undefined {
  return NL_CITIES.find((c) => c.slug === slug);
}

/** OSM amenity tags indexed per MVP plan */
export const AMENITY_TYPES = [
  "cafe",
  "restaurant",
  "fast_food",
  "hotel",
  "hostel",
  "library",
  "cinema",
  "fitness_centre",
  "coworking_space",
] as const;

/** Additional shop types indexed from OSM */
export const SHOP_TYPES = [
  "supermarket",
  "mall",
  "department_store",
  "clothes",
  "shoes",
  "convenience",
  "bakery",
  "butcher",
  "chemist",
  "electronics",
  "furniture",
  "hairdresser",
  "beauty",
  "books",
  "jewelry",
  "sports",
  "hardware",
  "pet",
] as const;

export type AmenityType = (typeof AMENITY_TYPES)[number];
export type ShopType = (typeof SHOP_TYPES)[number];

export const AMENITY_LABELS: Record<string, string> = {
  cafe: "Cafe",
  restaurant: "Restaurant",
  fast_food: "Fast food",
  hotel: "Hotel",
  hostel: "Hostel",
  library: "Library",
  cinema: "Cinema",
  fitness_centre: "Gym",
  coworking_space: "Coworking",
  supermarket: "Supermarket",
  mall: "Mall",
  department_store: "Department store",
  clothes: "Clothing store",
  shoes: "Shoe store",
  convenience: "Convenience store",
  bakery: "Bakery",
  butcher: "Butcher",
  chemist: "Pharmacy",
  electronics: "Electronics store",
  furniture: "Furniture store",
  hairdresser: "Hair salon",
  beauty: "Beauty store",
  books: "Bookstore",
  jewelry: "Jewelry store",
  sports: "Sports store",
  hardware: "Hardware store",
  pet: "Pet store",
  office: "Office",
  bar: "Bar",
  pub: "Pub",
};

export const CATEGORY_FILTERS = [
  { value: "", label: "All" },
  { value: "cafe", label: "Cafes" },
  { value: "restaurant", label: "Restaurants" },
  { value: "hotel", label: "Hotels" },
  { value: "supermarket", label: "Supermarkets" },
  { value: "clothes", label: "Clothing" },
  { value: "mall", label: "Malls" },
  { value: "department_store", label: "Department stores" },
  { value: "office", label: "Offices" },
] as const;
