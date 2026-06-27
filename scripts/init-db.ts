import { execSync } from "node:child_process";
import "dotenv/config";

console.log("Database schema pushen...");

try {
  execSync("npx drizzle-kit push --force", {
    stdio: "inherit",
    env: process.env,
  });
  console.log("Database klaar!");
} catch {
  console.error("Schema push mislukt");
  process.exit(1);
}
