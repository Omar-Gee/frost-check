import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { places } from "@/lib/db/schema";
import { addressHasStreet } from "@/lib/osm/address";
import { NL_CITIES, type NlCity } from "@/lib/osm/nl-cities";
import { resolveIndexedAddress } from "@/lib/osm/resolve-address";

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

function parseArgs() {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  let city: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit") {
      limit = Number(args[i + 1]);
      i++;
    } else if (args[i] === "--city") {
      city = args[i + 1] ?? null;
      i++;
    }
  }

  return { limit, city };
}

async function main() {
  const { limit, city } = parseArgs();
  const db = getDb();
  let rows = await db.select().from(places);

  if (city) {
    rows = rows.filter((row) => row.city === city);
  }

  let updated = 0;
  let withStreet = 0;
  let missingStreet = 0;
  let processedMissing = 0;

  for (const row of rows) {
    const country = countryForCity(row.city);
    const alreadyHasStreet = addressHasStreet(row.address, row.city, country);

    if (alreadyHasStreet) {
      withStreet++;
      continue;
    }

    if (limit != null && processedMissing >= limit) {
      missingStreet++;
      continue;
    }

    processedMissing++;
    const nextAddress = await resolveIndexedAddress({
      address: row.address,
      lat: row.lat,
      lng: row.lng,
      city: cityConfig(row.city),
    });

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

    if (processedMissing % 10 === 0) {
      console.log(
        `Progress: ${processedMissing} geocoded, ${updated} updated, ${withStreet} with street so far`
      );
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
