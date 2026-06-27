import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { places } from "@/lib/db/schema";

async function main() {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(places);
  console.log("place_count", row?.count ?? 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
