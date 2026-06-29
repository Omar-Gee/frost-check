import "dotenv/config";
import { eq } from "drizzle-orm";
import {
  scorePlaceAc,
  getRemainingDailyQuota,
  isUsingHeuristicScoring,
} from "@/lib/ai/ac-scorer";
import { getDb } from "@/lib/db/client";
import { indexJobs, places, reviewScores } from "@/lib/db/schema";
import { NL_CITIES } from "@/lib/osm/nl-cities";
import { fetchPlacesForCity } from "@/lib/osm/overpass";
import { buildGoogleMapsSearchUrl } from "@/lib/reviews/text-sources";
import { fetchWikipediaExtract } from "@/lib/reviews/wikipedia";

const DAILY_LIMIT = 800;
const BATCH_DELAY_MS = 500;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const skipAi = args.includes("--skip-ai");
  const cityArg = args.find((a) => !a.startsWith("--"));
  return { skipAi, cityArg };
}

async function main() {
  const { skipAi, cityArg } = parseArgs();

  if (skipAi) {
    process.env.SCORING_MODE = "heuristic";
    console.log("Heuristische scoring (--skip-ai)");
  }

  const cities = cityArg
    ? NL_CITIES.filter((c) => c.slug === cityArg)
    : NL_CITIES;

  if (cities.length === 0) {
    console.error(`Onbekende stad: ${cityArg}`);
    process.exit(1);
  }

  const db = getDb();
  let totalIndexed = 0;

  for (const city of cities) {
    console.log(`\n=== Indexeren: ${city.name} ===`);
    let cityIndexed = 0;

    const [job] = await db
      .insert(indexJobs)
      .values({ city: city.slug, status: "running", startedAt: new Date() })
      .returning();

    try {
      const osmPlaces = await fetchPlacesForCity(city);
      console.log(`${osmPlaces.length} locaties gevonden via OSM`);

      await db
        .update(indexJobs)
        .set({ placesFound: osmPlaces.length })
        .where(eq(indexJobs.id, job.id));

      for (const osmPlace of osmPlaces) {
        const googleMapsUrl = buildGoogleMapsSearchUrl(osmPlace.name, city.name);

        await db
          .insert(places)
          .values({
            id: osmPlace.id,
            osmType: osmPlace.osmType,
            osmId: osmPlace.osmId,
            name: osmPlace.name,
            amenity: osmPlace.amenity,
            lat: osmPlace.lat,
            lng: osmPlace.lng,
            address: osmPlace.address,
            city: city.name,
            wikipediaSlug: osmPlace.wikipediaSlug,
            website: osmPlace.website,
            phone: osmPlace.phone,
            googleMapsUrl,
          })
          .onConflictDoUpdate({
            target: places.id,
            set: {
              name: osmPlace.name,
              amenity: osmPlace.amenity,
              lat: osmPlace.lat,
              lng: osmPlace.lng,
              address: osmPlace.address,
              wikipediaSlug: osmPlace.wikipediaSlug,
              website: osmPlace.website,
              phone: osmPlace.phone,
              googleMapsUrl,
            },
          });

        let wikiText: string | null = null;
        if (osmPlace.wikipediaSlug) {
          const wiki = await fetchWikipediaExtract(osmPlace.wikipediaSlug);
          wikiText = wiki?.extract ?? null;
        }

        let aiResult;
        try {
          aiResult = await scorePlaceAc({
            name: osmPlace.name,
            amenity: osmPlace.amenity,
            osmText: osmPlace.osmText,
            wikipediaText: wikiText,
            address: osmPlace.address,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn(`Scoring mislukt voor ${osmPlace.name}: ${message}`);
          continue;
        }

        if (aiResult) {
          const usingHeuristic = isUsingHeuristicScoring();
          await db.insert(reviewScores).values({
            placeId: osmPlace.id,
            score: Math.round(aiResult.score),
            confidence: aiResult.confidence,
            summary: aiResult.summary,
            mentionCount: aiResult.mentionCount,
            snippets: JSON.stringify(aiResult.snippets),
            textSources: JSON.stringify(aiResult.textSources),
            hasAc: aiResult.hasAc,
            source: usingHeuristic ? "heuristic" : "ai",
            aiModel: usingHeuristic ? "heuristic" : "gemini-2.0-flash-lite",
          });

          await db
            .update(places)
            .set({ indexedAt: new Date() })
            .where(eq(places.id, osmPlace.id));

          if (!usingHeuristic) {
            await db
              .update(indexJobs)
              .set({ lastGeminiCall: new Date() })
              .where(eq(indexJobs.id, job.id));
          }

          cityIndexed++;
          totalIndexed++;
        }

        if (totalIndexed % 10 === 0 && totalIndexed > 0) {
          console.log(
            `  ${totalIndexed} geïndexeerd (${getRemainingDailyQuota()} Gemini calls resterend)`
          );
        }

        if (!skipAi) {
          await sleep(BATCH_DELAY_MS);
        }
      }

      await db
        .update(indexJobs)
        .set({
          status: "completed",
          placesIndexed: cityIndexed,
          finishedAt: new Date(),
        })
        .where(eq(indexJobs.id, job.id));

      console.log(`${city.name} klaar: ${cityIndexed} locaties geïndexeerd`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db
        .update(indexJobs)
        .set({ status: "failed", error: message, finishedAt: new Date() })
        .where(eq(indexJobs.id, job.id));
      console.error(`Fout bij ${city.name}:`, message);
    }
  }

  console.log(`\nTotaal geïndexeerd: ${totalIndexed} (limiet: ${DAILY_LIMIT}/dag)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
