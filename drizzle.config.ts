import { defineConfig } from "drizzle-kit";
import path from "node:path";
import "dotenv/config";

const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim();
const url = tursoUrl || `file:${path.join(process.cwd(), "local.db")}`;

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url,
    ...(tursoUrl && tursoToken ? { authToken: tursoToken } : {}),
  },
});
