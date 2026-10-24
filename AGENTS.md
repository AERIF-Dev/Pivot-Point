<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Architecture rules

- All money/time math lives in `src/lib/lifepath/` as framework-neutral TypeScript with tests; AI never computes numbers. Why: results must be deterministic and portable.
- `src/lib/lifepath/` and `src/lib/ai/contract.ts` must not import React, the router, or backend SDKs. Why: they are reused by the Worker adapter and tests.
- The AI proxy is `src/server/analyze.ts` (Web-standard Request -> Response); route files and `worker/` are thin adapters. Why: portability to Cloudflare Workers.
- The project requires Gemma 4 (`GEMMA_MODEL` in contract.ts) on the Google Gemini API with server-side `GEMINI_API_KEY`; do not swap providers. Why: hackathon requirement.
- The UI calls AI only through `src/lib/ai/client.ts`, only on explicit user action, with minimized inputs from `src/lib/ai/inputs.ts`. Why: privacy.
- Demo fixtures must always render with the "not a live Gemma 4 response" label (`source: "fixture"`). Why: never pass fixtures off as AI.
- App state is one `LifePathData` object in `src/state/lifepath-store.tsx`, persisted to localStorage only; no accounts or database. Why: MVP privacy scope.
