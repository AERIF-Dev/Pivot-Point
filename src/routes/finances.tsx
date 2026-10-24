import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, Clock, HandCoins, Plus, Receipt, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Assumption, NextStage, PageBody, PageHeader, Panel, StatCard, toneFor } from "@/components/lifepath/blocks";
import { DayPicker, NumberField, TextField, TimeField } from "@/components/lifepath/fields";
import { ConflictList, DayTimeline } from "@/components/lifepath/schedule-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { expenseBreakdown, summarizeJob } from "@/lib/lifepath/finance";
import { hours, money } from "@/lib/lifepath/format";
import { detectConflicts } from "@/lib/lifepath/schedule";
import type { FixedCommitment } from "@/lib/lifepath/types";
import { useLifePath } from "@/state/lifepath-store";

export const Route = createFileRoute("/finances")({
  head: () => ({
    meta: [
      { title: "Financial & Time Dashboard | LifePath AI" },
      {
        name: "description",
        content: "See monthly income, estimated spendable pay, expenses, remaining funds, and weekly work-plus-commute time.",
      },
      { property: "og:title", content: "Financial & Time Dashboard — LifePath AI" },
      { property: "og:description", content: "An honest view of your money and your time, with every assumption visible." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FinancesPage,
});

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const PRIORITY_SUGGESTIONS = ["Be home for dinner", "Weekends off", "Short commute", "Predictable schedule", "Time for classes"];

function FinancesPage() {
  const { data, patch } = useLifePath();
  const f = data.finances;
  const j = data.currentJob;
  const s = data.schedule;
  const summary = summarizeJob(j, f);
  const conflicts = detectConflicts(j, s, f);
  const breakdown = expenseBreakdown(j, f).filter((x) => x.amount > 0);
  const setF = (k: keyof typeof f) => (v: number) => patch("finances", { [k]: v } as Partial<typeof f>);
  const [priority, setPriority] = useState("");

  const addPriority = (p: string) => {
    const v = p.trim().slice(0, 120);
    if (!v || s.priorities.includes(v) || s.priorities.length >= 6) return;
    patch("schedule", { priorities: [...s.priorities, v] });
    setPriority("");
  };

  const updateCommitment = (id: string, p: Partial<FixedCommitment>) =>
    patch("schedule", { commitments: s.commitments.map((c) => (c.id === id ? { ...c, ...p } : c)) });

  const flowData = [
    { name: "Spendable income", value: Math.round(summary.totalSpendableMonthly) },
    { name: "Expenses", value: Math.round(summary.totalExpensesMonthly) },
  ];

  return (
    <>
      <PageHeader
        stage={3}
        eyebrow="Financial & Time Dashboard"
        title="Understand your real finances and schedule"
        description="Every number below is calculated by LifePath — not by AI — and updates as you type."
      />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Monthly gross income" value={money(summary.grossMonthly)} assumption="Hourly × paid hours × 52/12" />
          <StatCard
            label="Estimated spendable"
            value={money(summary.totalSpendableMonthly)}
            assumption={`${f.takeHomePercent}% take-home assumption + other income`}
          />
          <StatCard label="Monthly expenses" value={money(summary.totalExpensesMonthly)} sub={`${money(summary.jobCostsMonthly)} job-related`} />
          <StatCard
            label="Estimated remaining"
            value={money(summary.remainingMonthly)}
            tone={toneFor(summary.remainingMonthly, 0)}
            sub="per month"
          />
          <StatCard
            label="Work + commute"
            value={hours(summary.weeklyWorkAndCommuteHours)}
            sub={`${hours(summary.weeklyCommuteHours)} commuting / week`}
          />
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning-soft p-4 text-sm text-warning-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-strong" aria-hidden />
          <p>
            The take-home percentage is an adjustable assumption, <strong>not a tax calculation</strong>. Taxes, benefit
            eligibility, and irregular schedules can change your actual results.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <div className="space-y-6">
            <Panel title="Income" icon={<HandCoins className="h-4 w-4" />}>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField label="Current hourly wage" value={j.hourlyWage} onChange={(v) => patch("currentJob", { hourlyWage: v })} prefix="$" suffix="/hr" step={0.25} />
                <NumberField label="Paid hours per week" value={j.hoursPerWeek} onChange={(v) => patch("currentJob", { hoursPerWeek: v })} suffix="hrs" max={100} />
                <NumberField
                  label="Estimated take-home %"
                  value={f.takeHomePercent}
                  onChange={setF("takeHomePercent")}
                  suffix="%"
                  max={100}
                  hint="Adjustable assumption (default 78%)."
                />
                <NumberField label="Other household income (after tax)" value={f.secondIncomeMonthly} onChange={setF("secondIncomeMonthly")} prefix="$" suffix="/mo" hint="Optional second income." />
              </div>
            </Panel>

            <Panel title="Monthly expenses" icon={<Receipt className="h-4 w-4" />} description="Transportation and childcare are tied to your current job, so they change in the Job Decision Lab.">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <NumberField label="Housing" value={f.housing} onChange={setF("housing")} prefix="$" />
                <NumberField label="Utilities" value={f.utilities} onChange={setF("utilities")} prefix="$" />
                <NumberField label="Food" value={f.food} onChange={setF("food")} prefix="$" />
                <NumberField label="Transportation (current job)" value={j.transportationMonthly} onChange={(v) => patch("currentJob", { transportationMonthly: v })} prefix="$" />
                <NumberField label="Childcare (current job)" value={j.childcareMonthly} onChange={(v) => patch("currentJob", { childcareMonthly: v })} prefix="$" />
                <NumberField label="Debt payments" value={f.debtPayments} onChange={setF("debtPayments")} prefix="$" />
                <NumberField label="Insurance" value={f.insurance} onChange={setF("insurance")} prefix="$" />
                <NumberField label="Other job costs" value={j.otherJobCostsMonthly} onChange={(v) => patch("currentJob", { otherJobCostsMonthly: v })} prefix="$" hint="Uniforms, tools, parking…" />
                <NumberField label="Other monthly expenses" value={f.otherExpenses} onChange={setF("otherExpenses")} prefix="$" />
              </div>
            </Panel>

            <Panel title="Work & time" icon={<Clock className="h-4 w-4" />}>
              <div className="grid gap-4 sm:grid-cols-2">
                <TimeField label="Shift starts" value={j.shiftStart} onChange={(v) => patch("currentJob", { shiftStart: v })} />
                <TimeField label="Shift ends" value={j.shiftEnd} onChange={(v) => patch("currentJob", { shiftEnd: v })} />
                <DayPicker label="Working days" value={j.workDays} onChange={(v) => patch("currentJob", { workDays: v })} className="sm:col-span-2" />
                <NumberField label="Commute per work day (round trip)" value={j.commuteMinutesRoundTrip} onChange={(v) => patch("currentJob", { commuteMinutesRoundTrip: v })} suffix="min" />
              </div>
              <div className="mt-6 space-y-4 border-t border-border pt-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="needs-childcare" className="text-sm font-semibold">Childcare drop-off & pick-up</Label>
                    <p className="text-xs text-muted-foreground">Check shifts against childcare hours.</p>
                  </div>
                  <Switch id="needs-childcare" checked={s.needsChildcare} onCheckedChange={(v) => patch("schedule", { needsChildcare: v })} />
                </div>
                {s.needsChildcare ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TimeField label="Childcare opens" value={s.childcareOpen} onChange={(v) => patch("schedule", { childcareOpen: v })} />
                    <TimeField label="Childcare closes" value={s.childcareClose} onChange={(v) => patch("schedule", { childcareClose: v })} />
                    <NumberField label="Time needed at drop-off" value={s.dropoffBufferMinutes} onChange={(v) => patch("schedule", { dropoffBufferMinutes: v })} suffix="min" />
                    <NumberField label="Time needed at pick-up" value={s.pickupBufferMinutes} onChange={(v) => patch("schedule", { pickupBufferMinutes: v })} suffix="min" />
                  </div>
                ) : null}
              </div>
            </Panel>

            <Panel
              title="Fixed commitments"
              description="Classes, appointments, a second job — anything a shift can't overlap."
              icon={<CalendarClock className="h-4 w-4" />}
              actions={
                <Button
                  size="sm"
                  variant="outline"
                  disabled={s.commitments.length >= 6}
                  onClick={() =>
                    patch("schedule", {
                      commitments: [
                        ...s.commitments,
                        { id: crypto.randomUUID(), label: "", days: ["Tue", "Thu"], start: "18:00", end: "20:00" },
                      ],
                    })
                  }
                >
                  <Plus aria-hidden /> Add
                </Button>
              }
            >
              {s.commitments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No fixed commitments added.</p>
              ) : (
                <div className="space-y-4">
                  {s.commitments.map((c) => (
                    <div key={c.id} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[1fr_120px_120px_auto]">
                      <TextField label="What" value={c.label} onChange={(v) => updateCommitment(c.id, { label: v.slice(0, 60) })} placeholder="e.g. Evening class" />
                      <TimeField label="From" value={c.start} onChange={(v) => updateCommitment(c.id, { start: v })} />
                      <TimeField label="To" value={c.end} onChange={(v) => updateCommitment(c.id, { end: v })} />
                      <div className="flex items-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Remove commitment"
                          onClick={() => patch("schedule", { commitments: s.commitments.filter((x) => x.id !== c.id) })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <DayPicker label="Days" value={c.days} onChange={(v) => updateCommitment(c.id, { days: v })} className="sm:col-span-4" />
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6 space-y-3 border-t border-border pt-5">
                <Label htmlFor="priority-input" className="text-sm font-semibold">Work-life balance priorities</Label>
                <div className="flex flex-wrap gap-2">
                  {s.priorities.map((p) => (
                    <span key={p} className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-accent-foreground">
                      {p}
                      <button aria-label={`Remove ${p}`} onClick={() => patch("schedule", { priorities: s.priorities.filter((x) => x !== p) })}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    addPriority(priority);
                  }}
                >
                  <Input id="priority-input" value={priority} onChange={(e) => setPriority(e.target.value)} placeholder="Add a priority" className="h-10 bg-card" />
                  <Button type="submit" variant="outline">Add</Button>
                </form>
                <div className="flex flex-wrap gap-1.5">
                  {PRIORITY_SUGGESTIONS.filter((p) => !s.priorities.includes(p)).map((p) => (
                    <button key={p} type="button" onClick={() => addPriority(p)} className="rounded-full border border-dashed border-input px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground">
                      + {p}
                    </button>
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Panel title="Where the money goes" description="Monthly expenses by category">
              {breakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add expenses to see the breakdown.</p>
              ) : (
                <div className="grid items-center gap-4 sm:grid-cols-[180px_1fr]">
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={breakdown} dataKey="amount" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="var(--card)">
                          {breakdown.map((x, i) => (
                            <Cell key={x.key} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => money(v)} contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {breakdown.map((x, i) => (
                      <li key={x.key} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-foreground/80">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} aria-hidden />
                          {x.label}
                          {x.jobRelated ? <span className="text-[10px] text-muted-foreground">(job)</span> : null}
                        </span>
                        <span className="tabular font-medium">{money(x.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>

            <Panel title="Income vs. expenses" description="Estimated monthly">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flowData} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                    <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={48} />
                    <Tooltip formatter={(v: number) => money(v)} cursor={{ fill: "var(--muted)" }} contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      <Cell fill="var(--chart-2)" />
                      <Cell fill="var(--chart-1)" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                <span className="text-muted-foreground">Estimated remaining</span>
                <span className={`tabular font-bold ${summary.remainingMonthly >= 0 ? "text-success" : "text-destructive"}`}>
                  {money(summary.remainingMonthly)}
                </span>
              </div>
            </Panel>

            <Panel title="Your typical work day" description="Current job vs. childcare hours">
              <DayTimeline rows={[{ label: j.title || "Current job", job: j }]} schedule={s} />
              <div className="mt-5">
                <ConflictList conflicts={conflicts} />
              </div>
            </Panel>
            <Assumption>Weekly time = paid hours + (round-trip commute × working days). Months use 52/12 weeks.</Assumption>
          </div>
        </div>

        <NextStage to="/job-lab" label="Can I actually take this job?" description="Compare an offer against today — costs, time, and schedule." />
      </PageBody>
    </>
  );
}
