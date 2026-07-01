import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { places } from "@/lib/db/schema";
import {
  addressHasStreet,
  formatNominatimAddress,
  parseAddressFromTags,
} from "@/lib/osm/address";
import { NL_CITIES, type NlCity } from "@/lib/osm/nl-cities";
import { fetchOsmTags } from "@/lib/osm/overpass";
import { resolvePlaceAddress } from "@/lib/utils";

const NOMINATIM_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "FrostCheck/1.0 (https://github.com/Omar-Gee/frost-check; contact: dev@frostcheck.local)",
};

function countryForCity(cityName: string | null | undefined): string | null {
  if (!cityName) return null;
  return NL_CITIES.find((c) => c.name === cityName)?.country ?? null;
}

function cityConfig(cityName: string | null | undefined): NlCity {
  return (
    NL_CITIES.find((c) => c.name === cityName) ?? {
      slug: "unknown",
      name: cityName ?? "Unknown",
      lat: 0,
      lng: 0,
      radiusKm: 10,
      country: countryForCity(cityName) ?? "Netherlands",
    }
  );
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reverseGeocode(
  lat: number,
  lng: number,
  city: NlCity
): Promise<string | null> {
  await sleep(1100);
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");

  try {
    const response = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      address?: Record<string, string>;
    };

    if (!data.address) return null;
    return formatNominatimAddress(data.address, city);
  } catch {
    return null;
  }
}

async function resolveAddressForPlace(row: typeof places.$inferSelect) {
  const country = countryForCity(row.city);
  const city = cityConfig(row.city);

  if (addressHasStreet(row.address, row.city, country)) {
    return row.address;
  }

  const tags = await fetchOsmTags(row.osmType, row.osmId);
  if (tags) {
    const fromOsm = parseAddressFromTags(tags, city);
    if (addressHasStreet(fromOsm, row.city, country)) {
      return fromOsm;
    }
  }

  await sleep(500);
  const fromNominatim = await reverseGeocode(row.lat, row.lng, city);
  if (fromNominatim && addressHasStreet(fromNominatim, row.city, country)) {
    return fromNominatim;
  }

  return resolvePlaceAddress({
    address: row.address,
    city: row.city,
    lat: row.lat,
    lng: row.lng,
    country,
  });
}

async function main() {
  const db = getDb();
  const rows = await db.select().from(places);
  let updated = 0;
  let withStreet = 0;
  let missingStreet = 0;

  for (const row of rows) {
    const country = countryForCity(row.city);
    const nextAddress = await resolveAddressForPlace(row);

    if (addressHasStreet(nextAddress, row.city, country)) {
      withStreet++;
    } else {
      missingStreet++;
    }

    if (nextAddress !== row.address) {
      await db
        .update(places)
        .set({ address: nextAddress })
        .where(eq(places.id, row.id));
      updated++;
    }

    if (rows.length > 100 && updated % 25 === 0 && updated > 0) {
      console.log(`Progress: ${updated} updated…`);
    }
  }

  console.log(`Updated addresses for ${updated} places`);
  console.log(`Places with street: ${withStreet}`);
  console.log(`Places still missing street: ${missingStreet}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
