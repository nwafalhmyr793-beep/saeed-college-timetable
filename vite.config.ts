import vinext from "vinext";
import { defineConfig } from "vite";
import settings from "./standalone.config.json";
import "./scripts/runtime-env.mjs";

export default defineConfig(async () => {
  const { cloudflare } = await import("@cloudflare/vite-plugin");
  return {
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: {
          name: settings.worker_name,
          main: "vinext/server/fetch-handler",
          compatibility_date: "2026-05-15",
          compatibility_flags: ["nodejs_compat"],
          d1_databases: [{
            binding: "DB",
            database_name: settings.database_name,
            database_id: settings.database_id || "00000000-0000-4000-8000-000000000000",
            migrations_dir: "drizzle",
          }],
        },
      }),
    ],
  };
});
