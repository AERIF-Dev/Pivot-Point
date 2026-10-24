import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, CheckCircle2, Clock, FlaskConical, ListChecks, RotateCcw, Sparkles, Unlock, Wallet, Zap } from "lucide-react";
import { useMemo, useState } from "react";

import { AiAction, AiResultMeta } from "@/components/lifepath/ai";
import { PageBody, PageHeader, Panel } from "@/components/lifepath/blocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { fixtures } from "@/lib/ai/fixtures";
import { barriersInput } from "@/lib/ai/inputs";
import {
  applyChanges,
  evaluateChange,
  generateChanges,
  pickTopChanges,
  scenarioOutcome,
  type ChangeParam,
  type EvaluatedChange,
  type ScenarioOutcome,
} from "@/lib/lifepath/changes";
import { VERDICT_LABELS } from "@/lib/lifepath/compare";
import { hours, money, signedHours, signedMoney, wage } from "@/lib/lifepath/format";
import { formatClock } from "@/lib/lifepath/time";
import { useLifePath } from "@/state/lifepath-store";
import { useAiOperation } from "@/state/use-ai";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/one-change")({
  head: () => ({
    meta: [
      { title: "One Change Away — Remove the barrier | LifePath AI" },
      {
        name: "description",
        content: "Test changes like a negotiated wage, a later shift, or cheaper transportation and see exactly what each one unlocks.",
      },
      { property: "og:title", content: "One Change Away — LifePath AI" },
      {
        property: "og:description",
        content: "Sometimes the next step isn't a new job. It's removing the barrier that makes a better opportunity possible.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OneChangePage,
});

function formatParam(p: ChangeParam, v: number): string {
  switch (p.kind) {
    case "hourly":
      return `${wage(v)}/hr`;
    case "monthly":
      return `${money(v)}/mo`;
    case "clock":
      return formatClock(v);
    case "minutes":
      return `${v} min`;
  }
}

function OneChangePage() {
  const { data, update } = useLifePath();
  const defs = useMemo(() => generateChanges(data), [data]);
  const base = useMemo(() => scenarioOutcome(data), [data]);
  const applied = data.appliedChanges;

  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const evaluated = useMemo(
    () => defs.map((d) => evaluateChange(data, d, applied[d.id] ?? drafts[d.id] ?? d.param.defaultValue, base)),
    [defs, data, applied, drafts, base],
  );
  // Rank once on default values so cards don't reorder while sliders move.
  const topIds = useMemo(
    () => pickTopChanges(defs.map((d) => evaluateChange(data, d, d.param.defaultValue, base))).map((e) => e.def.id),
    [defs, data, base],
  );
  const top = topIds.map((id) => evaluated.find((e) => e.def.id === id)!).filter(Boolean);
  const others = evaluated.filter((e) => !topIds.includes(e.def.id));
  const onValue = (id: string, v: number) => {
    if (id in applied) setApplied(id, v);
    else setDrafts((d) => ({ ...d, [id]: v }));
  };
  const scenario = useMemo(() => scenarioOutcome(applyChanges(data, applied, defs)), [data, applied, defs]);
  const appliedCount = Object.keys(applied).filter((id) => defs.some((d) => d.id === id)).length;

  const setApplied = (id: string, value: number | null) =>
    update((d) => {
      const next = { ...d.appliedChanges };
      if (value == null) delete next[id];
      else next[id] = value;
      return { ...d, appliedChanges: next };
    });

  const barriersOp = useAiOperation("identify_barriers");
  const planOp = useAiOperation("generate_action_plan");
  const skillNames = (data.ai.extract_skills?.data as { skills?: { name: string }[] } | undefined)?.skills?.map((s) => s.name.slice(0, 80)).slice(0, 10) ?? [];
  const chosen = evaluated.filter((e) => e.def.id in applied).map((e) => e.def.title(e.value).slice(0, 240));

  return (
    <>
      <PageHeader
        stage={5}
        eyebrow="One Change Away"
        title="Find the one change that unlocks more"
        description="Sometimes the next step isn't a new job. It's removing the barrier that makes a better opportunity possible."
      />
      <PageBody>
        <ScenarioStrip base={base} scenario={scenario} appliedCount={appliedCount} onReset={() => update((d) => ({ ...d, appliedChanges: {} }))} />

        <section id="changes" className="scroll-mt-24 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Three changes worth testing</h2>
              <p className="text-sm text-muted-foreground">
                Calculated from your numbers. Adjust each change, then press “Try this change” to apply it to a copy of your scenario.
              </p>
            </div>
          </div>
          {top.length === 0 ? (
            <Panel>
              <p className="text-sm text-muted-foreground">
                Add your current job and an offer in the{" "}
                <Link to="/job-lab" className="font-medium text-primary underline-offset-4 hover:underline">Job Decision Lab</Link>{" "}
                to see calculated changes.
              </p>
            </Panel>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {top.map((e, i) => (
                <ChangeCard key={e.def.id} e={e} rank={i + 1} applied={e.def.id in applied} onApply={(v) => setApplied(e.def.id, v)} onValue={(v) => onValue(e.def.id, v)} />
              ))}
            </div>
          )}
          {others.length ? (
            <details className="surface group p-5">
              <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
                <span className="inline-flex items-center gap-2">
                  More changes to explore ({others.length})
                  <ArrowRight className="h-4 w-4 transition-transform group-open:rotate-90" aria-hidden />
                </span>
              </summary>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                {others.map((e) => (
                  <ChangeCard key={e.def.id} e={e} applied={e.def.id in applied} onApply={(v) => setApplied(e.def.id, v)} onValue={(v) => onValue(e.def.id, v)} />
                ))}
              </div>
            </details>
          ) : null}
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel
            title="What's really in the way?"
            description="Gemma 4 reviews the calculated results and your priorities to name the key barriers."
            icon={<Bot className="h-4 w-4" />}
            actions={barriersOp.result ? <AiResultMeta result={barriersOp.result} /> : null}
          >
            <AiAction
              label="Identify my barriers"
              onRun={() => barriersOp.run(barriersInput(data, base.comparison, evaluated))}
              loading={barriersOp.loading}
              error={barriersOp.error}
              configured={barriersOp.configured}
              disabled={evaluated.length === 0}
              onFixture={data.isSample ? () => barriersOp.useFixture(fixtures.identify_barriers) : undefined}
              privacyNote="Sends rounded differences, conflict descriptions, priorities, and change titles. No full budget."
            />
            {barriersOp.result ? (
              <div className="mt-5 space-y-3">
                {barriersOp.result.data.barriers.map((b, i) => (
                  <div key={i} className="animate-rise rounded-xl border border-border bg-background p-4">
                    <div className="font-semibold text-foreground">{b.barrier}</div>
                    <p className="mt-1 text-sm text-foreground/80">{b.whyItMatters}</p>
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div><dt className="text-xs font-semibold text-primary">Possible change</dt><dd>{b.possibleChange}</dd></div>
                      <div><dt className="text-xs font-semibold text-success">Could unlock</dt><dd>{b.unlocks}</dd></div>
                      <div><dt className="text-xs font-semibold text-foreground">Next action</dt><dd>{b.nextAction}</dd></div>
                      <div><dt className="text-xs font-semibold text-warning-strong">Verify first</dt><dd>{b.verifyFirst}</dd></div>
                    </dl>
                  </div>
                ))}
                {barriersOp.result.data.insight ? (
                  <p className="rounded-lg bg-primary-soft p-3 text-sm font-medium text-accent-foreground">{barriersOp.result.data.insight}</p>
                ) : null}
              </div>
            ) : null}
          </Panel>

          <Panel
            title="My action plan"
            description={chosen.length ? `Based on ${chosen.length} change(s) you're trying.` : "Try at least one change first, then build a plan around it."}
            icon={<ListChecks className="h-4 w-4" />}
            actions={planOp.result ? <AiResultMeta result={planOp.result} /> : null}
          >
            <AiAction
              label="Build my action plan"
              variant="soft"
              onRun={() =>
                planOp.run({
                  goal: `Improve monthly remaining funds by about ${money(data.targetImprovementMonthly)} with a workable schedule${data.offer.title ? `, possibly as ${data.offer.title}` : ""}.`.slice(0, 300),
                  chosenChanges: chosen.slice(0, 6),
                  skills: skillNames,
                  interests: data.profile.interests.slice(0, 400),
                  location: data.profile.location.slice(0, 80),
                })
              }
              loading={planOp.loading}
              error={planOp.error}
              configured={planOp.configured}
              disabled={chosen.length === 0}
              privacyNote="Sends your goal, chosen changes, skill names, interests, and city."
            />
            {planOp.result ? (
              <ol className="mt-5 space-y-3">
                {planOp.result.data.steps.map((s, i) => (
                  <li key={i} className="animate-rise flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.timeframe}</div>
                      <div className="text-sm font-medium text-foreground">{s.action}</div>
                      <div className="text-sm text-muted-foreground">{s.why}</div>
                    </div>
                  </li>
                ))}
                {planOp.result.data.encouragement ? (
                  <p className="pt-2 text-sm italic text-foreground/80">{planOp.result.data.encouragement}</p>
                ) : null}
              </ol>
            ) : null}
          </Panel>
        </div>

        <Panel title="Detroit-area resources" description="External, official websites — not verified matches for your situation.">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { name: "Detroit at Work", url: "https://detroitatwork.com/", body: "City of Detroit job and training portal." },
              { name: "Michigan 211", url: "https://mi211.org/", body: "Statewide help line for local services, including childcare and transportation." },
              { name: "Michigan Works!", url: "https://www.michiganworks.org/", body: "Statewide workforce development network." },
            ].map((r) => (
              <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className="group rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/50">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  {r.name}
                  <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
              </a>
            ))}
          </div>
        </Panel>
      </PageBody>
    </>
  );
}

function ScenarioStrip({
  base,
  scenario,
  appliedCount,
  onReset,
}: {
  base: ScenarioOutcome;
  scenario: ScenarioOutcome;
  appliedCount: number;
  onReset: () => void;
}) {
  const label = base.target === "offer" ? "Offer scenario" : "Current job";
  const items = [
    { icon: Wallet, label: "Remaining / month", before: money(base.remaining), after: money(scenario.remaining), delta: signedMoney(scenario.remaining - base.remaining), good: scenario.remaining - base.remaining > 0.5, bad: scenario.remaining - base.remaining < -0.5 },
    { icon: Clock, label: "Work + commute / week", before: hours(base.weeklyHours), after: hours(scenario.weeklyHours), delta: signedHours(scenario.weeklyHours - base.weeklyHours), good: scenario.weeklyHours < base.weeklyHours - 0.05, bad: scenario.weeklyHours > base.weeklyHours + 0.05 },
    { icon: Zap, label: "Schedule conflicts", before: String(base.hardConflictCount), after: String(scenario.hardConflictCount), delta: scenario.hardConflictCount === base.hardConflictCount ? "no change" : `${scenario.hardConflictCount - base.hardConflictCount > 0 ? "+" : "−"}${Math.abs(scenario.hardConflictCount - base.hardConflictCount)}`, good: scenario.hardConflictCount < base.hardConflictCount, bad: scenario.hardConflictCount > base.hardConflictCount },
  ];
  return (
    <div className="overflow-hidden rounded-2xl bg-hero p-5 text-navy-foreground sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-navy-muted">{label}</div>
          <div className="mt-1 text-lg font-semibold">
            {appliedCount === 0 ? "Original scenario" : `With ${appliedCount} change${appliedCount > 1 ? "s" : ""} applied`}
            <span className="mx-2 text-navy-muted">·</span>
            <span className={scenario.verdict === "better" ? "text-success" : scenario.verdict === "schedule-conflict" || scenario.verdict === "worse" ? "text-warning" : ""}>
              {VERDICT_LABELS[scenario.verdict]}
            </span>
          </div>
        </div>
        <Button variant="hero-outline" size="sm" onClick={onReset} disabled={appliedCount === 0}>
          <RotateCcw aria-hidden /> Reset to original
        </Button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {items.map((it) => (
          <div key={it.label} className="rounded-xl border border-navy-border bg-navy-foreground/5 p-4">
            <div className="flex items-center gap-2 text-xs text-navy-muted">
              <it.icon className="h-3.5 w-3.5" aria-hidden /> {it.label}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="tabular text-sm text-navy-muted line-through decoration-navy-muted/60">{appliedCount ? it.before : ""}</span>
              <span className="tabular text-2xl font-bold">{it.after}</span>
            </div>
            {appliedCount ? (
              <div className={cn("tabular mt-1 text-xs font-semibold", it.good ? "text-success" : it.bad ? "text-warning" : "text-navy-muted")}>{it.delta}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChangeCard({
  e,
  rank,
  applied,
  onApply,
  onValue,
}: {
  e: EvaluatedChange;
  rank?: number;
  applied: boolean;
  onApply: (value: number | null) => void;
  onValue: (value: number) => void;
}) {
  const { def, value, impact } = e;
  const p = def.param;
  return (
    <article
      className={cn(
        "animate-rise flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-card transition-shadow",
        applied ? "border-success ring-2 ring-success/25" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {rank ? <Badge variant="info">#{rank}</Badge> : null}
          {impact.conflictsResolved > 0 ? <Badge variant="success"><Unlock aria-hidden /> Resolves conflict</Badge> : null}
        </div>
        <Badge variant="secondary"><FlaskConical aria-hidden /> Calculated</Badge>
      </div>
      <h3 className="text-lg font-semibold leading-snug text-foreground">{def.title(value)}</h3>

      <div className="rounded-lg bg-muted p-3 text-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current obstacle</div>
        <p className="mt-0.5 text-foreground/85">{def.obstacle}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="font-medium text-muted-foreground" htmlFor={`param-${def.id}`}>{p.label}</label>
          <span className="tabular font-semibold text-primary">{formatParam(p, value)}</span>
        </div>
        <Slider
          id={`param-${def.id}`}
          aria-label={p.label}
          min={p.min}
          max={Math.max(p.max, p.min + p.step)}
          step={p.step}
          value={[value]}
          onValueChange={([v]) => onValue(v)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border p-2.5">
          <div className="text-[11px] text-muted-foreground">Financial impact</div>
          <div className={cn("tabular font-bold", impact.remainingDelta > 0.5 ? "text-success" : impact.remainingDelta < -0.5 ? "text-destructive" : "text-foreground")}>
            {Math.abs(impact.remainingDelta) < 0.5 ? "$0" : `${signedMoney(impact.remainingDelta)}/mo`}
          </div>
        </div>
        <div className="rounded-lg border border-border p-2.5">
          <div className="text-[11px] text-muted-foreground">Weekly time</div>
          <div className={cn("tabular font-bold", impact.weeklyHoursDelta < -0.05 ? "text-success" : impact.weeklyHoursDelta > 0.05 ? "text-destructive" : "text-foreground")}>
            {Math.abs(impact.weeklyHoursDelta) < 0.05 ? "No change" : signedHours(impact.weeklyHoursDelta)}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 text-sm">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
        <p><span className="font-semibold">Could unlock:</span> {def.opportunity(value)}</p>
      </div>

      <ul className="space-y-1 text-xs text-muted-foreground">
        {def.assumptions.map((a) => <li key={a}>• {a}</li>)}
      </ul>

      <p className="border-t border-border pt-3 text-sm"><span className="font-semibold">Next action:</span> {def.nextAction}</p>

      <div className="mt-auto flex gap-2">
        {applied ? (
          <Button variant="success" className="flex-1" onClick={() => onApply(null)}>
            <CheckCircle2 aria-hidden /> Applied — undo
          </Button>
        ) : (
          <Button className="flex-1" onClick={() => onApply(value)}>
            Try this change
          </Button>
        )}
      </div>
    </article>
  );
}
