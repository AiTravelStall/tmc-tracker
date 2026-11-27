// Cloudflare Worker entry: vinext's app handler, plus the Workers AI binding made visible to
// lib/server/salestrail/transcribe.ts (the free fallback for transcripts).
import app from "vinext/server/fetch-handler";

type Env = { AI?: unknown } & Record<string, unknown>;
type Ctx = { waitUntil(p: Promise<unknown>): void };

const handler = app as { fetch(req: Request, env: Env, ctx: Ctx): Promise<Response> };

const worker = {
  fetch(req: Request, env: Env, ctx: Ctx) {
    (globalThis as { __tmcWorkersAi?: unknown }).__tmcWorkersAi = env.AI;
    return handler.fetch(req, env, ctx);
  },
};

export default worker;
