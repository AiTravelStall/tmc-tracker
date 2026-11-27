import { bindings, defineConfig, defineWorker } from "cf/config";

// Workers Builds (CI) sets WORKERS_CI. Locally the secrets are declared so they load from .env.local
// and missing ones are flagged; in CI they are not, so a fresh Worker can deploy before its secrets exist.
const declareSecrets = !process.env.WORKERS_CI;

export default defineConfig({
  worker: defineWorker({
    name: "tmc-tracker",
    // worker.ts wraps vinext's handler to expose the Workers AI binding to transcription.
    entrypoint: "./worker.ts",
    compatibilityDate: "2026-11-26",
    // nodejs_compat fills process.env from the bindings below, which lib/server/env.ts reads.
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    // Supabase values are Worker secrets, added in the dashboard (Settings → Variables and Secrets)
    // or with `cf workers secrets update`. lib/server/env.ts reports any missing at runtime.
    // Never commit their values.
    env: {
      ASSETS: bindings.assets(),
      NEXT_PUBLIC_SUPABASE_URL: declareSecrets && bindings.secret(),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: declareSecrets && bindings.secret(),
      SUPABASE_SECRET_KEY: declareSecrets && bindings.secret(),
      // Call recordings. Optional: without them the Recordings page shows setup steps.
      SALESTRAIL_API_USERNAME: declareSecrets && bindings.secret(),
      SALESTRAIL_API_PASSWORD: declareSecrets && bindings.secret(),
      GROQ_API_KEY: declareSecrets && bindings.secret(),
      AI: bindings.ai(), // Workers AI: free fallback transcription
      NEXT_PUBLIC_APP_TIMEZONE: bindings.text("Asia/Kolkata"),
    },
  }),
});
