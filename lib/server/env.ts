import 'server-only';
import { z } from 'zod';

// Validated once per process (design doc §18.4). Missing values fail loudly at first use
// with a list of what to set, instead of surfacing as an opaque Supabase error later.
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  // New-style API keys. The legacy JWT anon/service_role keys are retired by Supabase.
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().startsWith('sb_publishable_'),
  SUPABASE_SECRET_KEY: z.string().startsWith('sb_secret_'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_TIMEZONE: z.string().min(1).default('Asia/Kolkata'),
});

export type Env = z.infer<typeof schema>;
let cached: Env | null = null;

export class EnvError extends Error {}

// Call recordings (Salestrail + transcription). Optional: the app runs without them and the
// Recordings page explains what to set. Kept apart from `env()` so a missing key never breaks sign-in.
const integrationSchema = z.object({
  SALESTRAIL_API_USERNAME: z.string().min(1),
  SALESTRAIL_API_PASSWORD: z.string().min(1),
  GROQ_API_KEY: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(24),
});
export type IntegrationEnv = z.infer<typeof integrationSchema>;

/** Salestrail settings, or null when the integration is not configured yet. */
export function integrationEnv(): IntegrationEnv | null {
  const parsed = integrationSchema.safeParse(process.env);
  return parsed.success ? parsed.data : null;
}

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new EnvError(`Missing or invalid environment variables: ${missing}. Copy .env.example to .env.local and fill them in.`);
  }
  cached = parsed.data;
  return cached;
}
