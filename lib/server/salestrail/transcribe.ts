import 'server-only';
import { log } from '../log';

export type Segment = { start: number; end: number; text: string };
export type Transcript = { text: string; segments: Segment[]; language: string | null; provider: string };

// Context for Whisper: names and the language mix it should expect on these calls.
const PROMPT = 'Phone call between The Modern Classroom, an education company, and a school in India. '
  + 'Speakers may use English, Hindi, Kannada or a mix of them.';
const GROQ_MAX_BYTES = 25 * 1024 * 1024; // free-tier upload limit
const GROQ_MODEL = 'whisper-large-v3';
const WORKERS_AI_MODEL = '@cf/openai/whisper-large-v3-turbo';

type WorkersAi = { run(model: string, input: Record<string, unknown>): Promise<unknown> };

/** The Workers AI binding, which worker.ts exposes on the Worker. Absent under `next dev`. */
function workersAi(): WorkersAi | null {
  const ai = (globalThis as { __tmcWorkersAi?: WorkersAi }).__tmcWorkersAi;
  return ai && typeof ai.run === 'function' ? ai : null;
}

function segmentsFrom(v: unknown): Segment[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((s) => {
    const { start, end, text } = (s ?? {}) as Record<string, unknown>;
    const t = typeof text === 'string' ? text.trim() : '';
    return t && typeof start === 'number' && typeof end === 'number' ? [{ start, end, text: t }] : [];
  });
}

async function groq(key: string, audio: Blob): Promise<Transcript> {
  if (audio.size > GROQ_MAX_BYTES) throw new Error('recording is larger than Groq accepts');
  const form = new FormData();
  form.append('file', audio, 'call.m4a');
  form.append('model', GROQ_MODEL);
  form.append('response_format', 'verbose_json');
  form.append('prompt', PROMPT);
  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form,
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as Record<string, unknown>;
  return {
    text: String(body.text ?? '').trim(), segments: segmentsFrom(body.segments),
    language: typeof body.language === 'string' ? body.language : null, provider: `groq/${GROQ_MODEL}`,
  };
}

async function cloudflare(ai: WorkersAi, audio: Blob): Promise<Transcript> {
  const out = (await ai.run(WORKERS_AI_MODEL, {
    audio: { body: audio.stream(), contentType: audio.type || 'audio/mp4' },
    initial_prompt: PROMPT, vad_filter: true,
  })) as Record<string, unknown>;
  const info = (out.transcription_info ?? {}) as Record<string, unknown>;
  return {
    text: String(out.text ?? '').trim(), segments: segmentsFrom(out.segments),
    language: typeof info.language === 'string' ? info.language : null, provider: `cloudflare/${WORKERS_AI_MODEL}`,
  };
}

/**
 * Transcribe with Groq (largest free allowance), falling back to Workers AI when Groq is
 * rate-limited, busy, not configured or rejects the file. Throws if neither can do it.
 */
export async function transcribe(audio: Blob, groqKey: string | undefined): Promise<Transcript> {
  const ai = workersAi();
  if (groqKey) {
    try {
      return await groq(groqKey, audio);
    } catch (e) {
      if (!ai) throw e;
      log.warn('groq transcription failed, using workers ai', { reason: e instanceof Error ? e.message : String(e) });
    }
  }
  if (!ai) throw new Error('No transcription service available: set GROQ_API_KEY or run on Cloudflare');
  return cloudflare(ai, audio);
}
