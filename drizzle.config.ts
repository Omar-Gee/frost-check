import { defineConfig } from "drizzle-kit";
import path from "node:path";
import "dotenv/config";

const url =
  process.env.TURSO_DATABASE_URL ??
  `file:${path.join(process.cwd(), "local.db")}`;

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
