import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Configure a Cloudflare D1 database with the binding name `DB` before using the application."
    );
  }

  return drizzle(env.DB, { schema });
}
