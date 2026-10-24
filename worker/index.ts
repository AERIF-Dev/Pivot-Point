// Optional standalone Cloudflare Worker for the PivotPoint proxy.
//
// The app's built-in endpoint (src/routes/api/analyze.ts) already runs on
// Cloudflare-compatible infrastructure. Use this adapter if you want to host the
// static frontend separately (e.g. Cloudflare Pages) and run only the AI proxy
// as a Worker. It reuses the exact same portable handler.
//
//   cd worker
//   npx wrangler secret put GEMINI_API_KEY
//   npx wrangler deploy
//
// Then point API_BASE in src/lib/ai/client.ts at the Worker's /api/analyze URL
// (and set ALLOWED_ORIGIN below to your frontend origin).
import { handleAnalyze } from "../src/server/analyze";

interface Env {
  GEMINI_API_KEY?: string | undefined;
  ALLOWED_ORIGIN?: string;
}

function withCors(res: Response, origin: string | null, env: Env): Response {
  const allowed = env.ALLOWED_ORIGIN;
  if (!allowed || origin !== allowed) return res;
  const headers = new Headers(res.headers);
  headers.set("access-control-allow-origin", allowed);
  headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  headers.set("access-control-allow-headers", "content-type");
  headers.set("vary", "origin");
  return new Response(res.body, { status: res.status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    if (url.pathname !== "/api/analyze") return new Response("Not found", { status: 404 });
    if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }), origin, env);
    if (env.ALLOWED_ORIGIN && origin && origin !== env.ALLOWED_ORIGIN) {
      return new Response(JSON.stringify({ ok: false, error: { code: "forbidden", message: "Origin not allowed" } }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
    // Cross-origin calls from the allowed frontend carry sec-fetch-site: cross-site;
    // strip it so the shared handler's same-site guard doesn't reject them.
    const forwarded = new Request(request, { headers: new Headers(request.headers) });
    forwarded.headers.delete("sec-fetch-site");
    const res = await handleAnalyze(forwarded, { GEMINI_API_KEY: env.GEMINI_API_KEY });
    return withCors(res, origin, env);
  },
};
