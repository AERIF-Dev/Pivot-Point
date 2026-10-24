import { createFileRoute } from "@tanstack/react-router";
import { AlertOctagon, Bot, Briefcase, CheckCircle2, CircleHelp, Scale, Target, TrendingDown, TrendingUp, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AiAction, AiResultMeta } from "@/components/lifepath/ai";
import { Assumption, NextStage, PageBody, PageHeader, Panel, StatCard, toneFor } from "@/components/lifepath/blocks";
import { DayPicker, NumberField, TextField, TimeField } from "@/components/lifepath/fields";
import { ConflictList, DayTimeline } from "@/components/lifepath/schedule-view";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { explainInput } from "@/lib/ai/inputs";
import { FINANCIAL_VERDICT_LABELS, VERDICT_LABELS, compareJobs, type Comparison, type Verdict } from "@/lib/lifepath/compare";
import { hours, money, signedHours, signedMoney, wage } from "@/lib/lifepath/format";
import type { JobTerms, LifePathData } from "@/lib/lifepath/types";
import { useLifePath } from "@/state/lifepath-store";
import { useAiOperation } from "@/state/use-ai";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/job-lab")({
  head: () => ({
    meta: [
      { title: "Job Decision Lab — Can I actually take this job? | PivotPoint" },
      {
        name: "description",
        content: "Compare a job offer with your current job on take-home pay, new costs, commute time, schedule conflicts, and break-even wage.",
      },
      { property: "og:title", content: "Job Decision Lab — PivotPoint" },
      { property: "og:description", content: "Higher pay doesn't always mean more money left over. See the real difference." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JobLabPage,
});

const VERDICT_STYLE: Record<Verdict, { box: string; icon: typeof CheckCircle2; text: string }> = {
  better: { box: "border-success/30 bg-success-soft", icon: TrendingUp, text: "text-success" },
  worse: { box: "border-destructive/30 bg-destructive-soft", icon: TrendingDown, text: "text-destructive" },
  "about-same": { box: "border-warning/40 bg-warning-soft", icon: Scale, text: "text-warning-strong" },
  "schedule-conflict": { box: "border-destructive/30 bg-destructive-soft", icon: AlertOctagon, text: "text-destructive" },
  insufficient: { box: "border-border bg-muted", icon: CircleHelp, text: "text-muted-foreground" },
};

function JobLabPage() {
  const { data, patch, setField } = useLifePath();
  const [whatIf, setWhatIf] = useState<number | null>(null);
  const effective: LifePathData = useMemo(
    () => (whatIf == null ? data : { ...data, offer: { ...data.offer, hourlyWage: whatIf } }),
    [data, whatIf],
  );
  const c = useMemo(() => compareJobs(effective), [effective]);
  const offeredWage = data.offer.hourlyWage;
  const sliderWage = whatIf ?? offeredWage;
  const sliderMin = Math.max(0, Math.floor(Math.min(offeredWage, c.breakEvenWage ?? offeredWage) - 5));
  const sliderMax = Math.ceil(Math.max(offeredWage, c.targetWage ?? offeredWage) + 8);
  const explainOp = useAiOperation("explain_scenario");
  const style = VERDICT_STYLE[c.verdict];
  const VerdictIcon = style.icon;

  return (
    <>
      <PageHeader
        stage={4}
        eyebrow="Job Decision Lab"
        title="Can I actually take this job?"
        description="Compare an offer with today on what really matters: money left over, time, and whether the schedule works."
      />
      <PageBody>
        <section id="comparison" className="scroll-mt-24 space-y-6">
          <div className={cn("rounded-2xl border p-5 sm:p-6", style.box)}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <VerdictIcon className={cn("mt-1 h-6 w-6 shrink-0", style.text)} aria-hidden />
                <div className="space-y-1.5">
                  <div className={cn("text-xl font-bold", style.text)}>{VERDICT_LABELS[c.verdict]}</div>
                  {c.verdict === "schedule-conflict" ? (
                    <div className="text-sm font-medium text-foreground">
                      Money alone: {FINANCIAL_VERDICT_LABELS[c.financialVerdict]}.
                    </div>
                  ) : null}
                  <p className="max-w-2xl text-sm leading-relaxed text-foreground/85">{c.explanation}</p>
                  <p className="text-xs text-muted-foreground">
                    PivotPoint never tells you to accept or reject a job. This is an estimate based on your assumptions.
                  </p>
                </div>
              </div>
              <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[420px]">
                <MiniStat label="Gross pay" value={signedMoney(c.deltas.grossMonthly)} tone={toneFor(c.deltas.grossMonthly)} />
                <MiniStat label="Remaining / mo" value={signedMoney(c.deltas.remainingMonthly)} tone={toneFor(c.deltas.remainingMonthly, 9)} />
                <MiniStat label="Commute / wk" value={signedHours(c.deltas.weeklyCommuteHours)} tone={toneFor(-c.deltas.weeklyCommuteHours, 0.1)} />
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="wage-slider" className="text-sm font-semibold text-foreground">
                  What if the offered wage were…
                </label>
                <div className="flex items-center gap-2">
                  <span className="tabular text-lg font-bold text-primary">{wage(sliderWage)}/hr</span>
                  {whatIf != null && whatIf !== offeredWage ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setWhatIf(null)}>
                        <RotateCcw aria-hidden /> Offered {wage(offeredWage)}
                      </Button>
                      <Button size="sm" variant="soft" onClick={() => { patch("offer", { hourlyWage: whatIf }); setWhatIf(null); }}>
                        Use as offer
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
              <Slider
                id="wage-slider"
                aria-label="Offered hourly wage"
                className="mt-4"
                min={sliderMin}
                max={Math.max(sliderMax, sliderMin + 1)}
                step={0.25}
                value={[sliderWage]}
                onValueChange={([v]) => setWhatIf(v ?? null)}
                disabled={c.financialVerdict === "insufficient"}
              />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground tabular">
                <span>{wage(sliderMin)}</span>
                <span>Updates instantly — no AI request</span>
                <span>{wage(Math.max(sliderMax, sliderMin + 1))}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
            <Panel title="Side by side" description="Estimated monthly unless noted" icon={<Scale className="h-4 w-4" />}>
              <ComparisonTable data={effective} c={c} />
            </Panel>
            <Panel title="Where the raise goes" description="Monthly, current vs. offer">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Take-home", Current: Math.round(c.current.totalSpendableMonthly), Offer: Math.round(c.offer.totalSpendableMonthly) },
                      { name: "Job costs", Current: Math.round(c.current.jobCostsMonthly), Offer: Math.round(c.offer.jobCostsMonthly) },
                      { name: "Remaining", Current: Math.round(c.current.remainingMonthly), Offer: Math.round(c.offer.remainingMonthly) },
                    ]}
                    margin={{ left: 0, right: 8 }}
                  >
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                    <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={48} />
                    <Tooltip formatter={(v: number) => money(v)} cursor={{ fill: "var(--muted)" }} contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine y={0} stroke="var(--muted-foreground)" />
                    <Bar dataKey="Current" fill="var(--chart-5)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Offer" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="The offer" description="Every value is an editable assumption." icon={<Briefcase className="h-4 w-4" />}>
            <JobForm job={data.offer} onChange={(p) => patch("offer", p)} showBenefits />
          </Panel>
          <Panel title="Your current job" description="Costs here disappear if you switch." icon={<Briefcase className="h-4 w-4" />}>
            <JobForm job={data.currentJob} onChange={(p) => patch("currentJob", p)} />
          </Panel>
        </div>

        <Panel id="conflicts" title="Hidden costs & schedule check" description="Shifts and commute vs. childcare and commitments" icon={<AlertOctagon className="h-4 w-4" />}>
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <DayTimeline
              rows={[
                { label: data.currentJob.title || "Current job", job: data.currentJob },
                { label: data.offer.title || "Offer", job: data.offer },
              ]}
              schedule={data.schedule}
            />
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="New job costs" value={signedMoney(c.deltas.jobCostsMonthly)} tone={toneFor(-c.deltas.jobCostsMonthly)} sub="per month" />
                <StatCard label="Work + commute" value={hours(c.offer.weeklyWorkAndCommuteHours)} sub={`${signedHours(c.deltas.weeklyWorkAndCommuteHours)} vs. today`} />
              </div>
              <ConflictList conflicts={c.offerConflicts} emptyLabel="No schedule conflicts found for the offer." />
            </div>
          </div>
        </Panel>

        <Panel id="break-even" title="Break-even & target wage" description="What the offer would need to pay" icon={<Target className="h-4 w-4" />}>
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <div className="space-y-4">
              <StatCard
                label="Break-even wage"
                value={c.breakEvenWage == null ? "—" : `${wage(c.breakEvenWage)}/hr`}
                tone="info"
                sub="Matches today's remaining funds"
                assumption="Includes the offer's job costs and benefit change"
              />
              <NumberField
                label="My monthly improvement goal"
                value={data.targetImprovementMonthly}
                onChange={(v) => setField("targetImprovementMonthly", v)}
                prefix="$"
                suffix="/mo"
                step={25}
              />
              <StatCard
                label={`Wage for +${money(c.targetImprovementMonthly)}/mo`}
                value={c.targetWage == null ? "—" : `${wage(c.targetWage)}/hr`}
                tone="positive"
                sub={
                  c.targetWage != null
                    ? `${c.targetWage >= sliderWage ? "+" : "−"}${wage(Math.abs(c.targetWage - sliderWage))}/hr vs. ${whatIf != null ? "what-if wage" : "offer"}`
                    : undefined
                }
              />
            </div>
            <SensitivityChart data={effective} c={c} currentWage={sliderWage} />
          </div>
        </Panel>

        <Panel
          title="Explain this in plain language"
          description="Gemma 4 explains the calculator's result. The numbers on this page remain the source of truth."
          icon={<Bot className="h-4 w-4" />}
          actions={explainOp.result ? <AiResultMeta result={explainOp.result} /> : null}
        >
          <AiAction
            label="Explain with Gemma 4"
            onRun={() => explainOp.run(explainInput(effective, c))}
            loading={explainOp.loading}
            error={explainOp.error}
            configured={explainOp.configured}
            disabled={c.financialVerdict === "insufficient"}
            privacyNote="Sends only job titles, rounded differences, and conflict descriptions — not your full budget."
          />
          {explainOp.result ? (
            <div className="mt-5 space-y-4 animate-rise">
              <h3 className="text-lg font-semibold text-foreground">{explainOp.result.data.headline}</h3>
              <p className="text-sm leading-relaxed text-foreground/85">{explainOp.result.data.explanation}</p>
              <div className="grid gap-4 md:grid-cols-2">
                {explainOp.result.data.considerations.length ? (
                  <div className="rounded-lg bg-muted p-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Things to consider</div>
                    <ul className="space-y-1 text-sm">{explainOp.result.data.considerations.map((x) => <li key={x}>• {x}</li>)}</ul>
                  </div>
                ) : null}
                {explainOp.result.data.questionsToAsk.length ? (
                  <div className="rounded-lg bg-primary-soft p-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent-foreground">Questions to ask the employer</div>
                    <ul className="space-y-1 text-sm text-foreground">{explainOp.result.data.questionsToAsk.map((x) => <li key={x}>• {x}</li>)}</ul>
                  </div>
                ) : null}
              </div>
              <Assumption>If any number in the AI text differs from the calculator above, trust the calculator.</Assumption>
            </div>
          ) : null}
        </Panel>

        <NextStage to="/one-change" label="One Change Away" description="Find the barrier whose removal makes this work." />
      </PageBody>
    </>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: ReturnType<typeof toneFor> }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={cn(
          "tabular text-lg font-bold",
          tone === "positive" ? "text-success" : tone === "negative" ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ComparisonTable({ data, c }: { data: LifePathData; c: Comparison }) {
  const rows: { label: string; cur: string; off: string; diff?: string; tone?: "good" | "bad" | null; strong?: boolean }[] = [];
  const d = (v: number, goodIfPositive = true) => (Math.abs(v) < 0.5 ? null : (v > 0) === goodIfPositive ? "good" : "bad");
  rows.push({ label: "Hourly wage", cur: wage(data.currentJob.hourlyWage), off: wage(data.offer.hourlyWage), diff: `${data.offer.hourlyWage - data.currentJob.hourlyWage >= 0 ? "+" : "−"}${wage(Math.abs(data.offer.hourlyWage - data.currentJob.hourlyWage))}`, tone: d(data.offer.hourlyWage - data.currentJob.hourlyWage) });
  rows.push({ label: "Paid hours / week", cur: `${data.currentJob.hoursPerWeek}`, off: `${data.offer.hoursPerWeek}`, diff: signedHours(c.deltas.weeklyPaidHours, 0), tone: null });
  rows.push({ label: "Gross pay", cur: money(c.current.grossMonthly), off: money(c.offer.grossMonthly), diff: signedMoney(c.deltas.grossMonthly), tone: d(c.deltas.grossMonthly) });
  rows.push({ label: `Est. take-home (${data.finances.takeHomePercent}%)`, cur: money(c.current.takeHomeMonthly), off: money(c.offer.takeHomeMonthly), diff: signedMoney(c.deltas.takeHomeMonthly), tone: d(c.deltas.takeHomeMonthly) });
  if (c.current.otherIncomeMonthly || c.offer.benefitsMonthlyChange) {
    rows.push({ label: "Other income + benefit change", cur: money(c.current.otherIncomeMonthly + c.current.benefitsMonthlyChange), off: money(c.offer.otherIncomeMonthly + c.offer.benefitsMonthlyChange), diff: signedMoney(c.offer.benefitsMonthlyChange - c.current.benefitsMonthlyChange), tone: d(c.offer.benefitsMonthlyChange - c.current.benefitsMonthlyChange) });
  }
  rows.push({ label: "Childcare", cur: money(data.currentJob.childcareMonthly), off: money(data.offer.childcareMonthly), diff: signedMoney(data.offer.childcareMonthly - data.currentJob.childcareMonthly), tone: d(data.offer.childcareMonthly - data.currentJob.childcareMonthly, false) });
  rows.push({ label: "Transportation", cur: money(data.currentJob.transportationMonthly), off: money(data.offer.transportationMonthly), diff: signedMoney(data.offer.transportationMonthly - data.currentJob.transportationMonthly), tone: d(data.offer.transportationMonthly - data.currentJob.transportationMonthly, false) });
  if (data.currentJob.otherJobCostsMonthly || data.offer.otherJobCostsMonthly) {
    rows.push({ label: "Other job costs", cur: money(data.currentJob.otherJobCostsMonthly), off: money(data.offer.otherJobCostsMonthly), diff: signedMoney(data.offer.otherJobCostsMonthly - data.currentJob.otherJobCostsMonthly), tone: d(data.offer.otherJobCostsMonthly - data.currentJob.otherJobCostsMonthly, false) });
  }
  rows.push({ label: "Living expenses (same in both)", cur: money(c.current.baseExpensesMonthly), off: money(c.offer.baseExpensesMonthly), diff: "$0", tone: null });
  rows.push({ label: "Remaining funds", cur: money(c.current.remainingMonthly), off: money(c.offer.remainingMonthly), diff: signedMoney(c.deltas.remainingMonthly), tone: d(c.deltas.remainingMonthly), strong: true });
  rows.push({ label: "Commute / week", cur: hours(c.current.weeklyCommuteHours), off: hours(c.offer.weeklyCommuteHours), diff: signedHours(c.deltas.weeklyCommuteHours), tone: d(c.deltas.weeklyCommuteHours, false) });
  rows.push({ label: "Work + commute / week", cur: hours(c.current.weeklyWorkAndCommuteHours), off: hours(c.offer.weeklyWorkAndCommuteHours), diff: signedHours(c.deltas.weeklyWorkAndCommuteHours), tone: d(c.deltas.weeklyWorkAndCommuteHours, false) });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="py-2 pr-3 font-medium" />
            <th scope="col" className="py-2 pr-3 text-right font-medium">{data.currentJob.title || "Current"}</th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">{data.offer.title || "Offer"}</th>
            <th scope="col" className="py-2 text-right font-medium">Difference</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className={cn("border-b border-border/60 last:border-0", r.strong && "bg-muted/60")}>
              <th scope="row" className={cn("py-2.5 pr-3 text-left font-normal text-foreground/80", r.strong && "font-semibold text-foreground")}>{r.label}</th>
              <td className="tabular py-2.5 pr-3 text-right">{r.cur}</td>
              <td className="tabular py-2.5 pr-3 text-right">{r.off}</td>
              <td className={cn("tabular py-2.5 text-right font-semibold", r.tone === "good" ? "text-success" : r.tone === "bad" ? "text-destructive" : "text-muted-foreground")}>{r.diff}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3">
        <Assumption>Take-home is an adjustable estimate, not a tax calculation. Earnings use each job's own paid hours.</Assumption>
      </div>
    </div>
  );
}

function SensitivityChart({ data, c, currentWage }: { data: LifePathData; c: Comparison; currentWage: number }) {
  const points = useMemo(() => {
    if (c.financialVerdict === "insufficient") return [];
    const lo = Math.max(0, Math.floor(Math.min(currentWage, c.breakEvenWage ?? currentWage) - 4));
    const hi = Math.ceil(Math.max(currentWage, c.targetWage ?? currentWage) + 4);
    const out: { wage: number; change: number }[] = [];
    for (let w = lo; w <= hi + 1e-9; w += 0.5) {
      const cmp = compareJobs({ ...data, offer: { ...data.offer, hourlyWage: w } });
      out.push({ wage: w, change: Math.round(cmp.deltas.remainingMonthly) });
    }
    return out;
  }, [data, c.financialVerdict, c.breakEvenWage, c.targetWage, currentWage]);

  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">Add the offer's pay and hours to see how wage changes the outcome.</p>;
  }
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-foreground">Monthly remaining funds vs. today, by offered wage</div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ left: 0, right: 16, top: 8 }}>
            <CartesianGrid stroke="var(--border)" />
            <XAxis dataKey="wage" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(v: number) => `$${v}`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis tickFormatter={(v: number) => `$${v}`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={56} />
            <Tooltip
              formatter={(v: number) => signedMoney(v)}
              labelFormatter={(v: number) => `${wage(v)}/hr`}
              contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
            />
            <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
            {c.breakEvenWage != null ? (
              <ReferenceLine x={c.breakEvenWage} stroke="var(--chart-1)" label={{ value: "Break-even", fontSize: 11, fill: "var(--chart-1)", position: "insideTopLeft" }} />
            ) : null}
            {c.targetWage != null ? (
              <ReferenceLine x={c.targetWage} stroke="var(--chart-2)" strokeDasharray="4 4" label={{ value: "Goal", fontSize: 11, fill: "var(--chart-2)", position: "insideTopRight" }} />
            ) : null}
            <ReferenceLine x={currentWage} stroke="var(--chart-3)" label={{ value: "Selected", fontSize: 11, fill: "var(--warning-strong)", position: "insideBottomRight" }} />
            <Line type="monotone" dataKey="change" name="Change in remaining" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function JobForm({ job, onChange, showBenefits }: { job: JobTerms; onChange: (p: Partial<JobTerms>) => void; showBenefits?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField label="Position title" value={job.title} onChange={(v) => onChange({ title: v })} className="sm:col-span-2" />
      <NumberField label="Hourly pay" value={job.hourlyWage} onChange={(v) => onChange({ hourlyWage: v })} prefix="$" suffix="/hr" step={0.25} />
      <NumberField label="Paid hours per week" value={job.hoursPerWeek} onChange={(v) => onChange({ hoursPerWeek: v })} suffix="hrs" max={100} />
      <TimeField label="Shift starts" value={job.shiftStart} onChange={(v) => onChange({ shiftStart: v })} />
      <TimeField label="Shift ends" value={job.shiftEnd} onChange={(v) => onChange({ shiftEnd: v })} />
      <DayPicker label="Working days" value={job.workDays} onChange={(v) => onChange({ workDays: v })} className="sm:col-span-2" />
      <NumberField label="Commute (round trip, per day)" value={job.commuteMinutesRoundTrip} onChange={(v) => onChange({ commuteMinutesRoundTrip: v })} suffix="min" />
      <NumberField label="Transportation cost" value={job.transportationMonthly} onChange={(v) => onChange({ transportationMonthly: v })} prefix="$" suffix="/mo" />
      <NumberField label="Childcare cost" value={job.childcareMonthly} onChange={(v) => onChange({ childcareMonthly: v })} prefix="$" suffix="/mo" />
      <NumberField label="Other job-specific costs" value={job.otherJobCostsMonthly} onChange={(v) => onChange({ otherJobCostsMonthly: v })} prefix="$" suffix="/mo" />
      {showBenefits ? (
        <>
          <NumberField
            label="Benefit change vs. today"
            value={job.benefitsMonthlyChange}
            onChange={(v) => onChange({ benefitsMonthlyChange: v })}
            prefix="$"
            suffix="/mo"
            min={-5000}
            hint="+ if benefits save you money, − if they cost more."
          />
          <TextField label="Benefit notes (optional)" value={job.benefitsNote} onChange={(v) => onChange({ benefitsNote: v.slice(0, 200) })} placeholder="e.g. cheaper health plan" />
        </>
      ) : null}
    </div>
  );
}
