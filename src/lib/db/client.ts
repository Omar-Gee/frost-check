import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import path from "node:path";
import * as schema from "./schema";

let _db: LibSQLDatabase<typeof schema> | null = null;
let _client: Client | null = null;

function createLibsqlClient(): Client {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (url) {
    return createClient({
      url,
      authToken: authToken || undefined,
    });
  }

  const localPath = path.join(process.cwd(), "local.db");
  return createClient({ url: `file:${localPath}` });
}

export function getDb(): LibSQLDatabase<typeof schema> {
  if (!_db) {
    _client = createLibsqlClient();
    _db = drizzle(_client, { schema });
  }
  return _db;
}

export { schema };
