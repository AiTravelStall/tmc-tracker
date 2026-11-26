import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "tmc-tracker",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-26",
    // nodejs_compat fills process.env from the bindings below, which lib/server/env.ts reads.
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      // Set with `cf workers secrets put` (production) or .env.local (local preview). Never commit values.
      NEXT_PUBLIC_SUPABASE_URL: bindings.secret(),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: bindings.secret(),
      SUPABASE_SECRET_KEY: bindings.secret(),
      NEXT_PUBLIC_APP_TIMEZONE: bindings.text("Asia/Kolkata"),
    },
  }),
});
