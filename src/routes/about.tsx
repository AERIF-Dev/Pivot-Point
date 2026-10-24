import { createFileRoute } from "@tanstack/react-router";
import { Bot, Calculator, ExternalLink, Github, Lock, ShieldCheck, Trash2 } from "lucide-react";

import { AiStatusBadge } from "@/components/lifepath/ai";
import { PageBody, PageHeader, Panel } from "@/components/lifepath/blocks";
import { ClearDataButton } from "@/components/layout/site-footer";
import { GEMMA_MODEL } from "@/lib/ai/contract";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "How PivotPoint works — Privacy, AI, and calculations" },
      {
        name: "description",
        content: "How PivotPoint calculates results, when it uses Gemma 4, what data leaves your browser, and its limits.",
      },
      { property: "og:title", content: "How PivotPoint works" },
      { property: "og:description", content: "Deterministic math, user-initiated Gemma 4 analysis, and browser-only storage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

const RESOURCES = [
  { name: "Detroit at Work", url: "https://detroitatwork.com/", body: "City of Detroit portal for jobs, training, and career services." },
  { name: "Michigan 211", url: "https://mi211.org/", body: "Connects Michigan residents with local help — childcare, transportation, utilities, and more." },
  { name: "Michigan Works!", url: "https://www.michiganworks.org/", body: "Statewide network of workforce development agencies and service centers." },
];

function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="How PivotPoint works"
        description="PivotPoint helps people make informed career, financial, and life decisions by connecting real skills, real costs, and real schedules."
        actions={<AiStatusBadge />}
      />
      <PageBody>
        <div className="grid gap-6 md:grid-cols-3">
          <Panel title="Math you can check" icon={<Calculator className="h-4 w-4" />}>
            <ul className="space-y-2 text-sm text-foreground/85">
              <li>All money and time numbers come from plain, tested calculation code — never from AI.</li>
              <li>Monthly pay = hourly × paid hours × 52 ÷ 12.</li>
              <li>Spendable pay uses an adjustable take-home % (default 78%). It is not a tax calculation.</li>
              <li>Break-even wage = the hourly pay where the offer leaves the same money as today, after its job costs.</li>
              <li>Schedule checks compare shift times + one-way commute with childcare hours and your commitments.</li>
            </ul>
          </Panel>
          <Panel title="AI that explains, not decides" icon={<Bot className="h-4 w-4" />}>
            <ul className="space-y-2 text-sm text-foreground/85">
              <li>
                AI analysis: Gemma 4 (<code className="rounded bg-muted px-1 text-xs">{GEMMA_MODEL}</code>) through Google's Gemini API.
              </li>
              <li>AI runs only when you press an AI button — never automatically on page load.</li>
              <li>It finds transferable skills, suggests career directions, and explains results in plain language.</li>
              <li>It is instructed not to invent job openings, salaries, programs, or eligibility, and to flag regulated roles.</li>
              <li>Labeled examples are always marked “not a live Gemma 4 response”.</li>
            </ul>
          </Panel>
          <Panel title="Your data stays with you" icon={<Lock className="h-4 w-4" />}>
            <ul className="space-y-2 text-sm text-foreground/85">
              <li>No accounts. Everything is saved only in this browser.</li>
              <li>No addresses, bank details, Social Security numbers, or document uploads.</li>
              <li>AI requests send only the minimum needed — e.g. your tasks for skills, or rounded differences for explanations — to Google's API.</li>
              <li>User text is treated strictly as data, never as instructions.</li>
            </ul>
            <div className="mt-4">
              <ClearDataButton variant="outline" />
            </div>
          </Panel>
        </div>

        <Panel title="Detroit-area resources" description="External, official websites. PivotPoint does not verify that any program fits your situation." icon={<ExternalLink className="h-4 w-4" />}>
          <div className="grid gap-3 sm:grid-cols-3">
            {RESOURCES.map((r) => (
              <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/50">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  {r.name} <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
                <p className="mt-2 text-xs text-primary">{r.url.replace(/^https:\/\//, "").replace(/\/$/, "")}</p>
              </a>
            ))}
          </div>
        </Panel>

        <div className="grid gap-6 md:grid-cols-2">
          <Panel title="Important limits" icon={<ShieldCheck className="h-4 w-4" />}>
            <p className="text-sm leading-relaxed text-foreground/85">
              PivotPoint is educational decision support — not professional financial, legal, or employment advice. It does
              not access credit reports, determine loan or benefit eligibility, or tell you to accept or reject a job. Real
              taxes, benefits, and schedules can change outcomes.
            </p>
          </Panel>
          <Panel title="Open-source civic technology" icon={<Github className="h-4 w-4" />}>
            <p className="text-sm leading-relaxed text-foreground/85">
              Built for Hack for Humanity Detroit 2026 (Job Displacement track). MIT licensed. The calculation engine is
              framework-neutral TypeScript, and the AI proxy is a small portable endpoint that can run as a Cloudflare Worker.
            </p>
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> No analytics record your profile content.
            </p>
          </Panel>
        </div>
      </PageBody>
    </>
  );
}
