import { createFileRoute } from "@tanstack/react-router";

// Thin adapter: all logic lives in the portable src/server/analyze.ts handler,
// which the Cloudflare Worker adapter (worker/index.ts) also uses.
async function handle(request: Request) {
  const { handleAnalyze } = await import("@/server/analyze");
  return handleAnalyze(request, { GEMINI_API_KEY: process.env.GEMINI_API_KEY });
}

export const Route = createFileRoute("/api/analyze")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
