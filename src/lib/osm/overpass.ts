import { placeIdFromOsm } from "@/lib/utils";
import { extractOsmTagText } from "@/lib/reviews/text-sources";
import {
  AMENITY_TYPES,
  SHOP_TYPES,
  type AmenityType,
  type NlCity,
  type ShopType,
} from "./nl-cities";
import { parseAddressFromTags } from "./address";

export interface OsmPlace {
  id: string;
  osmType: string;
  osmId: string;
  name: string;
  amenity: string | null;
  lat: number;
  lng: number;
  address: string | null;
  wikipediaSlug: string | null;
  osmText: string | null;
  website: string | null;
  phone: string | null;
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const OVERPASS_HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  Accept: "application/json",
  "User-Agent":
    "FrostCheck/1.0 (https://github.com/frostcheck; contact: dev@frostcheck.local)",
};

const FALLBACK_STATUSES = new Set([429, 502, 504]);
const NODE_BATCH_SIZE = 3;
const MAX_RETRIES_PER_ENDPOINT = 3;
const RETRY_DELAY_MS = 5000;
const RATE_LIMIT_DELAY_MS = 60_000;
const BATCH_DELAY_MS = 3000;
const FETCH_TIMEOUT_MS = 90_000;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function aroundFilter(lat: number, lng: number, radiusKm: number): string {
  const radiusM = radiusKm * 1000;
  return `around:${radiusM},${lat},${lng}`;
}

function getGridCells(city: NlCity): Array<{ lat: number; lng: number; radiusKm: number }> {
  const half = city.radiusKm / 2;
  const latOffset = half / 111;
  const lngOffset = half / (111 * Math.cos((city.lat * Math.PI) / 180));

  return [
    { lat: city.lat + latOffset / 2, lng: city.lng - lngOffset / 2, radiusKm: half },
    { lat: city.lat + latOffset / 2, lng: city.lng + lngOffset / 2, radiusKm: half },
    { lat: city.lat - latOffset / 2, lng: city.lng - lngOffset / 2, radiusKm: half },
    { lat: city.lat - latOffset / 2, lng: city.lng + lngOffset / 2, radiusKm: half },
  ];
}

function buildNodeQuery(
  lat: number,
  lng: number,
  radiusKm: number,
  amenities: AmenityType[]
): string {
  const around = aroundFilter(lat, lng, radiusKm);
  const nodeQueries = amenities
    .map((a) => `  node(${around})[name]["amenity"="${a}"];`)
    .join("\n");

  return `
[out:json][timeout:120];
(
${nodeQueries}
);
out body;
`.trim();
}

function buildShopNodeQuery(
  lat: number,
  lng: number,
  radiusKm: number,
  shops: ShopType[]
): string {
  const around = aroundFilter(lat, lng, radiusKm);
  const nodeQueries = shops
    .map((s) => `  node(${around})[name]["shop"="${s}"];`)
    .join("\n");

  return `
[out:json][timeout:120];
(
${nodeQueries}
);
out body;
`.trim();
}

function buildShopWayQuery(
  lat: number,
  lng: number,
  radiusKm: number,
  shops: ShopType[]
): string {
  const around = aroundFilter(lat, lng, radiusKm);
  const wayQueries = shops
    .map((s) => `  way(${around})[name]["shop"="${s}"];`)
    .join("\n");

  return `
[out:json][timeout:120];
(
${wayQueries}
);
out center tags;
`.trim();
}

function buildOfficeNodeQuery(lat: number, lng: number, radiusKm: number): string {
  const around = aroundFilter(lat, lng, radiusKm);
  return `
[out:json][timeout:120];
(
  node(${around})[name][office];
);
out body;
`.trim();
}

function buildWayQuery(
  lat: number,
  lng: number,
  radiusKm: number,
  amenities: AmenityType[]
): string {
  const around = aroundFilter(lat, lng, radiusKm);
  const wayQueries = amenities
    .map((a) => `  way(${around})[name]["amenity"="${a}"];`)
    .join("\n");

  return `
[out:json][timeout:120];
(
${wayQueries}
);
out center tags;
`.trim();
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

function parseAddress(tags: Record<string, string>, city: NlCity): string {
  return parseAddressFromTags(tags, city);
}

function parseWikipediaSlug(tags: Record<string, string>): string | null {
  const wiki = tags.wikipedia ?? tags["wikipedia:nl"];
  if (!wiki) return null;
  const parts = wiki.split(":");
  return parts.length >= 2 ? parts.slice(1).join(":") : wiki;
}

function resolveCategory(tags: Record<string, string>): string | null {
  if (tags.amenity && AMENITY_TYPES.includes(tags.amenity as AmenityType)) {
    return tags.amenity;
  }
  if (tags.shop && SHOP_TYPES.includes(tags.shop as ShopType)) {
    return tags.shop;
  }
  if (tags.office) {
    return "office";
  }
  return tags.amenity ?? null;
}

function elementToPlace(el: OverpassElement, city: NlCity): OsmPlace | null {
  const tags = el.tags ?? {};
  const name = tags.name;
  if (!name) return null;

  const amenity = resolveCategory(tags);
  if (!amenity) return null;

  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null) return null;

  const osmType = el.type === "node" ? "node" : el.type;
  const osmId = String(el.id);
  const osmText = extractOsmTagText(tags);

  return {
    id: placeIdFromOsm(osmType, osmId),
    osmType,
    osmId,
    name,
    amenity,
    lat,
    lng,
    address: parseAddress(tags, city),
    wikipediaSlug: parseWikipediaSlug(tags),
    osmText: osmText || null,
    website: tags.website ?? tags["contact:website"] ?? null,
    phone: tags.phone ?? tags["contact:phone"] ?? null,
  };
}

function mergeElements(
  elements: OverpassElement[],
  city: NlCity,
  seen: Set<string>,
  places: OsmPlace[]
) {
  for (const el of elements) {
    const place = elementToPlace(el, city);
    if (!place || seen.has(place.id)) continue;
    seen.add(place.id);
    places.push(place);
  }
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchOverpass(query: string): Promise<Response> {
  let lastError: Error | null = null;

  for (const url of OVERPASS_ENDPOINTS) {
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_ENDPOINT; attempt++) {
      if (attempt > 0) {
        await sleep(RETRY_DELAY_MS);
      }

      const response = await fetch(url, {
        method: "POST",
        headers: OVERPASS_HEADERS,
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (response.ok) {
        return response;
      }

      const error = new Error(
        `Overpass API error (${url}): ${response.status} ${response.statusText}`
      );

      if (response.status === 429) {
        lastError = error;
        console.warn(
          `Overpass rate limited (${url}). Waiting ${RATE_LIMIT_DELAY_MS / 1000}s before retry...`
        );
        await sleep(RATE_LIMIT_DELAY_MS);
        if (attempt < MAX_RETRIES_PER_ENDPOINT) {
          continue;
        }
        break;
      }

      if (FALLBACK_STATUSES.has(response.status)) {
        lastError = error;
        if (attempt < MAX_RETRIES_PER_ENDPOINT) {
          continue;
        }
        break;
      }

      throw error;
    }
  }

  throw lastError ?? new Error("Overpass API error: no endpoints available");
}

export async function fetchOsmTags(
  osmType: string,
  osmId: string
): Promise<Record<string, string> | null> {
  const type =
    osmType === "relation" ? "relation" : osmType === "way" ? "way" : "node";
  const query = `[out:json][timeout:30]; ${type}(${osmId}); out tags;`;

  try {
    const response = await fetchOverpass(query);
    const data = (await response.json()) as OverpassResponse;
    return data.elements[0]?.tags ?? null;
  } catch {
    return null;
  }
}

async function fetchBatch(
  city: NlCity,
  label: string,
  query: string,
  seen: Set<string>,
  places: OsmPlace[]
) {
  console.log(`  Overpass: ${city.name} (${label})...`);
  try {
    const response = await fetchOverpass(query);
    const data = (await response.json()) as OverpassResponse;
    mergeElements(data.elements, city, seen, places);
    console.log(`  Overpass: ${label} → ${data.elements.length} elements (${places.length} total places)`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `Overpass batch failed for ${city.name} (${label}): ${message}`
    );
  }
}

async function fetchPlacesForCell(
  city: NlCity,
  cell: { lat: number; lng: number; radiusKm: number },
  amenities: AmenityType[],
  seen: Set<string>,
  places: OsmPlace[]
) {
  const label = `${cell.lat.toFixed(3)},${cell.lng.toFixed(3)}`;

  const nodeBatches = chunk(amenities, NODE_BATCH_SIZE);
  for (const batch of nodeBatches) {
    const query = buildNodeQuery(cell.lat, cell.lng, cell.radiusKm, batch);
    await fetchBatch(city, `grid ${label} nodes: ${batch.join(", ")}`, query, seen, places);
    await sleep(BATCH_DELAY_MS);
  }

  const shopBatches = chunk([...SHOP_TYPES], NODE_BATCH_SIZE);
  for (const batch of shopBatches) {
    const shopNodeQuery = buildShopNodeQuery(
      cell.lat,
      cell.lng,
      cell.radiusKm,
      batch
    );
    await fetchBatch(
      city,
      `grid ${label} shop nodes: ${batch.join(", ")}`,
      shopNodeQuery,
      seen,
      places
    );
    await sleep(BATCH_DELAY_MS);
  }

  for (const shop of SHOP_TYPES) {
    const shopWayQuery = buildShopWayQuery(cell.lat, cell.lng, cell.radiusKm, [shop]);
    await fetchBatch(city, `grid ${label} shop ways: ${shop}`, shopWayQuery, seen, places);
    await sleep(BATCH_DELAY_MS);
  }

  const officeQuery = buildOfficeNodeQuery(cell.lat, cell.lng, cell.radiusKm);
  await fetchBatch(city, `grid ${label} offices`, officeQuery, seen, places);
  await sleep(BATCH_DELAY_MS);

  for (const amenity of amenities) {
    const query = buildWayQuery(cell.lat, cell.lng, cell.radiusKm, [amenity]);
    await fetchBatch(city, `grid ${label} ways: ${amenity}`, query, seen, places);
    await sleep(BATCH_DELAY_MS);
  }
}

export async function fetchPlacesForCity(
  city: NlCity,
  amenities: AmenityType[] = [...AMENITY_TYPES]
): Promise<OsmPlace[]> {
  const seen = new Set<string>();
  const places: OsmPlace[] = [];
  const cells = getGridCells(city);

  for (const cell of cells) {
    await fetchPlacesForCell(city, cell, amenities, seen, places);
  }

  return places;
}

export async function fetchPlacesForCities(
  cities: NlCity[],
  amenities?: AmenityType[]
): Promise<Map<string, OsmPlace[]>> {
  const result = new Map<string, OsmPlace[]>();

  for (const city of cities) {
    const places = await fetchPlacesForCity(city, amenities);
    result.set(city.slug, places);
    await sleep(1500);
  }

  return result;
}
