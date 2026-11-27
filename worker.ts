// Cloudflare Worker entry: vinext's app handler plus a cron that syncs Salestrail calls.
// The cron calls the app's own /api/cron/salestrail route, so the sync runs through the same
// code (and Supabase setup) as everything else and can be tested under `next dev` too.
import app from "vinext/server/fetch-handler";

type Env = { AI?: unknown; CRON_SECRET?: string } & Record<string, unknown>;
type Ctx = { waitUntil(p: Promise<unknown>): void };

// lib/server/salestrail/transcribe.ts reads the Workers AI binding from here.
const exposeAi = (env: Env) => {
  (globalThis as { __tmcWorkersAi?: unknown }).__tmcWorkersAi = env.AI;
};

const handler = app as { fetch(req: Request, env: Env, ctx: Ctx): Promise<Response> };

const worker = {
  fetch(req: Request, env: Env, ctx: Ctx) {
    exposeAi(env);
    return handler.fetch(req, env, ctx);
  },
  async scheduled(_event: unknown, env: Env, ctx: Ctx) {
    exposeAi(env);
    if (!env.CRON_SECRET) return; // integration not configured yet
    const req = new Request("https://cron.internal/api/cron/salestrail", {
      method: "POST", headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    });
    ctx.waitUntil(handler.fetch(req, env, ctx).then(async (res) => {
      if (!res.ok) console.error(JSON.stringify({ level: "error", msg: "salestrail cron failed", status: res.status, body: (await res.text()).slice(0, 300) }));
    }));
  },
};

export default worker;
