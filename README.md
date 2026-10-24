# LifePath AI

**Better decisions. Better opportunities. Better lives.**

LifePath AI helps people make informed career, financial, and life decisions: it surfaces transferable skills,
compares job offers on real-life costs, finds schedule conflicts, and identifies the single change that could unlock a
better opportunity.

Built for **Hack for Humanity Detroit 2026**. Primary track: Job Displacement. Also relevant to Detroit economic
mobility, technical accessibility, and AI literacy. AI powered by **Gemma 4** (`gemma-4-26b-a4b-it`) via the Google
Gemini API. Open-source civic technology prototype (MIT).

> Educational decision support only. Not professional financial, legal, or employment advice.

## Features

| Page | What it does |
| --- | --- |
| `/` | Landing, demo entry |
| `/profile` | Stage 1: guided form or "in my own words", plus the **Try Sample Profile** button |
| `/skills` | Stage 2: Gemma 4 transferable-skills extraction and "What else could I do?" career directions |
| `/finances` | Stage 3: income, expenses, commute, childcare, commitments, charts, conflict detection |
| `/job-lab` | Stage 4: current job vs. offer, verdict, wage slider, break-even and target wage, AI explanation |
| `/one-change` | Stage 5: calculated "One Change Away" scenarios with Try/Reset, AI barriers, and action plan |
| `/about` | Calculation rules, AI use, privacy, Detroit resources |

**Try Sample Journey** (header button) walks through the full story in six steps, in under 90 seconds.

## Architecture

```text
src/lib/lifepath/     Framework-neutral TypeScript: types, finance, schedule, compare, changes (+ tests)
src/lib/ai/contract.ts  Shared zod schemas for AI requests and responses
src/lib/ai/client.ts    Browser API client (the only place the UI calls the AI proxy)
src/lib/ai/inputs.ts    Builds minimized, sanitized AI inputs
src/lib/ai/fixtures.ts  Clearly labeled demo examples (never presented as Gemma output)
src/server/analyze.ts   Portable Request -> Response Gemma 4 proxy (validation, prompts, retries, timeouts)
src/server/prompts.ts   Prompt builders; user text is always wrapped as data
src/routes/api/analyze.ts  Thin TanStack Start server route that calls the portable handler
worker/               Optional standalone Cloudflare Worker adapter for the same handler
```

- **All arithmetic is deterministic** TypeScript (52/12 weeks per month, adjustable 78% take-home assumption). AI
  never produces the numbers; it receives rounded results as trusted context and explains them.
- **AI is user-initiated only.** One endpoint, `/api/analyze`, with a validated `operation` discriminator:
  `extract_skills`, `suggest_careers`, `explain_scenario`, `identify_barriers`, `generate_action_plan`.
  Responses are parsed, validated with zod, bounded in length, and retried once on malformed JSON or 429/5xx.
- **Storage:** browser `localStorage` only (`lifepath-ai:v1`). **Clear My Data** is in the footer and About page.
  No accounts, database, or analytics on profile content.

## Configuration

| Name | Where | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Server-side secret | Google AI Studio key for Gemma 4. Never use a `VITE_` prefix. |

Without the key, every calculator works and AI panels show **"AI connection required"**.

## Local development

```sh
npm install
cp .env.example .env    # add GEMINI_API_KEY (the .env file is git-ignored via *.local / your own rules)
npm run dev
npm test                # deterministic finance, schedule, and scenario tests
npm run build
```

## Testing the sample journey

1. Open `/` and click **Try the Live Demo** (or **Try Sample Journey** in the header).
2. Step through: profile → skills (press **Find my transferable skills**) → Job Lab comparison → hidden costs and the
   6 AM childcare conflict → break-even wage (≈ $24.66/hr, drag the wage slider) → One Change Away (press **Try this
   change** on "Ask to start at 8:00 AM").
3. Expected sample results: +$867/mo gross, ≈ +$46/mo remaining after +$630 in new costs, +5 h/week commuting, verdict
   "Scheduling conflict needs resolution".

## Cloudflare deployment

The app's server route already runs on Cloudflare-compatible infrastructure. To host it yourself:

1. Build with `npm run build` and deploy the output with Wrangler, setting `GEMINI_API_KEY` as a Worker secret.
2. Or host the frontend statically and deploy only the AI proxy from `worker/`:
   `cd worker && npx wrangler secret put GEMINI_API_KEY && npx wrangler deploy`, set `ALLOWED_ORIGIN` in
   `worker/wrangler.toml`, and point `API_BASE` in `src/lib/ai/client.ts` at the Worker URL.

## License

MIT — see [LICENSE](./LICENSE).
