// Portable AI proxy for Gemma 4 on the Google Gemini API.
// Pure Web-standard Request -> Response, so it runs unchanged in the
// TanStack Start server route (src/routes/api/analyze.ts) and in the
// standalone Cloudflare Worker adapter (worker/index.ts).
import {
  AnalyzeRequestSchema,
  GEMMA_MODEL,
  OutputSchemas,
  type AiErrorCode,
  type AnalyzeFailure,
  type AnalyzeRequest,
  type AiStatus,
} from "../lib/ai/contract";
import { buildPrompt } from "./prompts";

export interface AnalyzeEnv {
  GEMINI_API_KEY?: string | undefined;
}

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_BODY_CHARS = 32_000;
const FIRST_BYTE_TIMEOUT_MS = 75_000;
const IDLE_TIMEOUT_MS = 30_000;
const OVERALL_TIMEOUT_MS = 120_000;
const MAX_ATTEMPTS = 2;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const fail = (code: AiErrorCode, message: string, status: number) =>
  json({ ok: false, error: { code, message } } satisfies AnalyzeFailure, status);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Pulls the first JSON object out of a model reply (tolerates fences / stray text). */
export function extractJsonObject(raw: string): unknown {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object in reply");
  return JSON.parse(cleaned.slice(start, end + 1));
}

type GemmaResult =
  | { kind: "ok"; text: string }
  | { kind: "refused"; reason: string }
  | { kind: "http"; status: number; message: string; retryAfterMs?: number | undefined }
  | { kind: "timeout" };

type Part = { text?: string; thought?: boolean };
type GemmaChunk = {
  promptFeedback?: { blockReason?: string };
  candidates?: { finishReason?: string; content?: { parts?: Part[] } }[];
};

/**
 * Calls Gemma 4 with streaming (SSE) so long queue times don't hit a fixed
 * total timeout: we wait up to FIRST_BYTE_TIMEOUT_MS for the first chunk and
 * IDLE_TIMEOUT_MS between chunks, with an overall cap.
 */
async function callGemma(apiKey: string, prompt: string): Promise<GemmaResult> {
  const controller = new AbortController();
  const overall = setTimeout(() => controller.abort(), OVERALL_TIMEOUT_MS);
  let idle: ReturnType<typeof setTimeout> | undefined;
  const arm = (ms: number) => {
    if (idle) clearTimeout(idle);
    idle = setTimeout(() => controller.abort(), ms);
  };

  try {
    arm(FIRST_BYTE_TIMEOUT_MS);
    const res = await fetch(`${GEMINI_BASE}/${GEMMA_MODEL}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        // Gemma 4 thinking: "minimal" = off, "high" = on. Off keeps answers fast for interactive use.
        generationConfig: { temperature: 0.4, maxOutputTokens: 4096, thinkingConfig: { thinkingLevel: "minimal" } },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      let message = `Gemini API returned ${res.status}.`;
      try {
        const body = (await res.json()) as { error?: { message?: string } } | { error?: { message?: string } }[];
        const err = Array.isArray(body) ? body[0]?.error : body?.error;
        if (err?.message) message = err.message.slice(0, 300);
      } catch {
        /* ignore */
      }
      const ra = Number(res.headers.get("retry-after"));
      return {
        kind: "http",
        status: res.status,
        message,
        retryAfterMs: Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 5000) : undefined,
      };
    }
    if (!res.body) return { kind: "http", status: 502, message: "Empty response from the Gemini API." };

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    let finishReason: string | undefined;
    let blockReason: string | undefined;

    const handleEvent = (event: string) => {
      for (const line of event.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        try {
          const chunk = JSON.parse(payload) as GemmaChunk;
          if (chunk.promptFeedback?.blockReason) blockReason = chunk.promptFeedback.blockReason;
          const cand = chunk.candidates?.[0];
          if (cand?.finishReason) finishReason = cand.finishReason;
          for (const p of cand?.content?.parts ?? []) if (!p.thought) text += p.text ?? "";
        } catch {
          /* ignore malformed keep-alive lines */
        }
      }
    };

    arm(IDLE_TIMEOUT_MS);
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      arm(IDLE_TIMEOUT_MS);
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        handleEvent(buffer.slice(0, sep));
        buffer = buffer.slice(sep + 2);
      }
    }
    if (buffer.trim()) handleEvent(buffer);

    if (blockReason) return { kind: "refused", reason: blockReason };
    text = text.trim();
    if (!text && finishReason && finishReason !== "STOP" && finishReason !== "MAX_TOKENS") {
      return { kind: "refused", reason: finishReason };
    }
    return { kind: "ok", text };
  } catch (err) {
    if (controller.signal.aborted || (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError"))) {
      return { kind: "timeout" };
    }
    return { kind: "http", status: 502, message: "Could not reach the Gemini API." };
  } finally {
    clearTimeout(overall);
    if (idle) clearTimeout(idle);
  }
}

async function runOperation(apiKey: string, req: AnalyzeRequest): Promise<Response> {
  const schema = OutputSchemas[req.operation];
  let retryNote: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await callGemma(apiKey, buildPrompt(req, retryNote));

    if (result.kind === "timeout") {
      return fail("timeout", "Gemma 4 took too long to respond. Please try again.", 504);
    }
    if (result.kind === "refused") {
      return fail(
        "content_refused",
        "Gemma 4 declined to answer this request. Try editing the profile text.",
        422,
      );
    }
    if (result.kind === "http") {
      const { status, message } = result;
      if ((status === 429 || status >= 500) && attempt < MAX_ATTEMPTS) {
        await sleep(result.retryAfterMs ?? 1500);
        continue;
      }
      if (status === 429) return fail("rate_limited", "Gemma 4 is busy (rate limited). Wait a moment and try again.", 429);
      if (status === 401 || status === 403)
        return fail("upstream_auth", "The Gemini API key was rejected. Check GEMINI_API_KEY.", 502);
      if (status === 404)
        return fail("model_unavailable", `The model ${GEMMA_MODEL} is not available for this API key.`, 502);
      if (status === 400) return fail("upstream_error", message, 502);
      return fail("upstream_error", "The Gemini API had a temporary problem. Try again shortly.", 502);
    }

    try {
      const parsed = schema.parse(extractJsonObject(result.text));
      return json({
        ok: true,
        operation: req.operation,
        source: "gemma",
        model: GEMMA_MODEL,
        data: parsed,
      });
    } catch {
      retryNote =
        "Your previous reply was not a single valid JSON object matching the shape. Reply again with ONLY the JSON object.";
    }
  }
  return fail("bad_ai_output", "Gemma 4 returned a response LifePath could not read. Please try again.", 502);
}

export async function handleAnalyze(request: Request, env: AnalyzeEnv): Promise<Response> {
  const apiKey = env.GEMINI_API_KEY?.trim();

  if (request.method === "GET") {
    const status: AiStatus = {
      configured: Boolean(apiKey),
      model: GEMMA_MODEL,
      provider: "Google Gemini API",
    };
    return json(status);
  }
  if (request.method !== "POST") return fail("invalid_request", "Method not allowed", 405);

  // Only same-site browser calls (blocks other sites from spending the key).
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return fail("forbidden", "Cross-site requests are not allowed.", 403);
  }

  if (!apiKey) {
    return fail("not_configured", "AI connection required: GEMINI_API_KEY is not configured.", 503);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) return fail("payload_too_large", "Request is too large.", 413);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail("invalid_request", "Request body must be JSON.", 400);
  }
  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail("invalid_request", "Request did not match the expected format.", 400);
  }
  return runOperation(apiKey, parsed.data);
}
