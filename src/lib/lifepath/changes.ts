// "One Change Away" scenario engine. Every number here is deterministic.
import { compareJobs, hasEnoughOfferInfo, type Comparison, type Verdict } from "./compare";
import { money, wage as fmtWage } from "./format";
import { hardConflicts, planDay } from "./schedule";
import { formatClock, shiftLengthMinutes, toTimeString } from "./time";
import type { JobTerms, LifePathData } from "./types";

export type ChangeParamKind = "hourly" | "monthly" | "clock" | "minutes";

export interface ChangeParam {
  label: string;
  kind: ChangeParamKind;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export type ChangeCategory =
  | "wage"
  | "shift"
  | "childcare-hours"
  | "childcare-cost"
  | "commute"
  | "transportation"
  | "expense";

export interface ChangeDefinition {
  id: string;
  category: ChangeCategory;
  title: (value: number) => string;
  obstacle: string;
  opportunity: (value: number) => string;
  assumptions: string[];
  nextAction: string;
  param: ChangeParam;
  apply: (data: LifePathData, value: number) => LifePathData;
}

export type TargetJobKey = "offer" | "currentJob";

export interface ScenarioOutcome {
  target: TargetJobKey;
  comparison: Comparison;
  /** Monthly remaining funds for the job being analyzed */
  remaining: number;
  /** Weekly work + commute hours for the job being analyzed */
  weeklyHours: number;
  hardConflictCount: number;
  /** Gap to the user's improvement goal; null when analyzing only the current job. */
  targetShortfallMonthly: number | null;
  verdict: Verdict;
}

export interface ChangeImpact {
  remainingDelta: number;
  weeklyHoursDelta: number;
  conflictsResolved: number;
  conflictsAdded: number;
}

export interface EvaluatedChange {
  def: ChangeDefinition;
  value: number;
  outcome: ScenarioOutcome;
  impact: ChangeImpact;
}

export function targetJobKey(data: LifePathData): TargetJobKey {
  return hasEnoughOfferInfo(data) ? "offer" : "currentJob";
}

export function scenarioOutcome(data: LifePathData): ScenarioOutcome {
  const target = targetJobKey(data);
  const comparison = compareJobs(data);
  const summary = target === "offer" ? comparison.offer : comparison.current;
  const conflicts = target === "offer" ? comparison.offerConflicts : comparison.currentConflicts;
  return {
    target,
    comparison,
    remaining: summary.remainingMonthly,
    weeklyHours: summary.weeklyWorkAndCommuteHours,
    hardConflictCount: hardConflicts(conflicts).length,
    targetShortfallMonthly: target === "offer"
      ? Math.max(0, comparison.targetImprovementMonthly - comparison.deltas.remainingMonthly)
      : null,
    verdict: comparison.verdict,
  };
}

const roundUp = (v: number, step: number) => Math.ceil(v / step - 1e-9) * step;
const roundDown = (v: number, step: number) => Math.floor(v / step + 1e-9) * step;
const roundTo = (v: number, step: number) => Math.round(v / step) * step;

function withJob(data: LifePathData, key: TargetJobKey, patch: Partial<JobTerms>): LifePathData {
  return { ...data, [key]: { ...data[key], ...patch } };
}

/** Generates candidate changes relevant to the (unmodified) scenario. */
export function generateChanges(data: LifePathData): ChangeDefinition[] {
  const key = targetJobKey(data);
  const job = data[key];
  const base = scenarioOutcome(data);
  const c = base.comparison;
  const defs: ChangeDefinition[] = [];
  const plan = planDay(job, data.schedule);
  const conflicts = key === "offer" ? c.offerConflicts : c.currentConflicts;
  const dropoff = conflicts.find((x) => x.kind === "childcare-dropoff");
  const pickup = conflicts.find((x) => x.kind === "childcare-pickup");
  const length = shiftLengthMinutes(job.shiftStart, job.shiftEnd) ?? 480;
  const jobName = job.title || (key === "offer" ? "the offer" : "your job");

  // 1. Negotiate a higher wage (offer only)
  if (key === "offer" && c.targetWage != null) {
    const current = data.offer.hourlyWage;
    const goal = roundUp(c.targetWage, 0.25);
    const def = Math.max(roundTo(current + 0.5, 0.25), goal);
    defs.push({
      id: "negotiate-wage",
      category: "wage",
      title: (v) => `Negotiate ${fmtWage(v)}/hr`,
      obstacle:
        c.deltas.remainingMonthly < c.targetImprovementMonthly
          ? `After new costs, ${jobName} changes remaining funds by ${money(c.deltas.remainingMonthly)}/month — short of your ${money(c.targetImprovementMonthly)} goal.`
          : `The offer already meets your goal; a higher rate would add cushion.`,
      opportunity: (v) =>
        v >= c.targetWage!
          ? `Meets your goal of ${money(c.targetImprovementMonthly)}/month more than today (needs ≈ ${fmtWage(c.targetWage)}/hr).`
          : `Moves closer to your goal; ${fmtWage(c.targetWage)}/hr would reach it.`,
      assumptions: [
        "The employer agrees to a higher rate — not guaranteed.",
        "Paid hours and job costs stay as entered.",
        `Take-home uses your ${data.finances.takeHomePercent}% assumption, not a tax calculation.`,
      ],
      nextAction:
        "Ask the hiring manager whether the rate is negotiable, pointing to specific experience that matches the role.",
      param: {
        label: "Negotiated hourly wage",
        kind: "hourly",
        min: roundDown(current, 0.25),
        max: Math.max(roundUp(current * 1.5, 0.25), def + 2),
        step: 0.25,
        defaultValue: def,
      },
      apply: (d, v) => withJob(d, "offer", { hourlyWage: v }),
    });
  }

  // 2. Later shift start (fixes drop-off conflict)
  if (dropoff && plan.childcareOpen != null && plan.shiftStart != null) {
    const needed = roundUp(
      plan.childcareOpen + Math.max(0, data.schedule.dropoffBufferMinutes) + plan.oneWayCommute,
      15,
    );
    defs.push({
      id: "later-shift",
      category: "shift",
      title: (v) => `Ask to start at ${formatClock(v)}`,
      obstacle: dropoff.detail,
      opportunity: (v) =>
        `Tests ${formatClock(v)}–${formatClock(v + length)} with the same paid hours. Check remaining conflicts below: later starts can create pick-up conflicts.`,
      assumptions: [
        "The employer offers or approves a later shift — not guaranteed.",
        "Shift length and pay stay the same.",
      ],
      nextAction: `Before accepting, ask whether starting at ${formatClock(needed)} (or joining a later crew) is possible for this role.`,
      param: {
        label: "Shift start time",
        kind: "clock",
        min: plan.shiftStart,
        max: Math.min(needed + 180, 22 * 60),
        step: 15,
        defaultValue: needed,
      },
      apply: (d, v) =>
        withJob(d, key, { shiftStart: toTimeString(v), shiftEnd: toTimeString(v + length) }),
    });
  }

  // 3. Earlier childcare opening (fixes drop-off conflict)
  if (dropoff && plan.dropoffBy != null && plan.childcareOpen != null) {
    const needed = Math.max(0, roundDown(plan.dropoffBy, 15));
    defs.push({
      id: "earlier-childcare",
      category: "childcare-hours",
      title: (v) => `Find care that opens by ${formatClock(v)}`,
      obstacle: dropoff.detail,
      opportunity: () => `Tests earlier drop-off for the ${formatClock(plan.shiftStart)} shift; other schedule barriers may remain.`,
      assumptions: [
        "Assumes a provider, relative, or before-care option exists — PivotPoint has not verified any.",
        "Any extra cost is not included; enter it in childcare cost if you know it.",
      ],
      nextAction:
        "Ask your current provider about early drop-off, or search licensed providers with early hours (e.g. through Michigan 211).",
      param: {
        label: "Childcare opening time",
        kind: "clock",
        min: Math.max(0, needed - 60),
        max: plan.childcareOpen,
        step: 15,
        defaultValue: needed,
      },
      apply: (d, v) => ({ ...d, schedule: { ...d.schedule, childcareOpen: toTimeString(v) } }),
    });
  }

  // 3b. Later childcare closing (fixes pick-up conflict)
  if (pickup && plan.pickupAt != null && plan.childcareClose != null) {
    const needed = Math.min(23 * 60 + 45, roundUp(plan.pickupAt, 15));
    defs.push({
      id: "later-pickup",
      category: "childcare-hours",
      title: (v) => `Find care open until ${formatClock(v)}`,
      obstacle: pickup.detail,
      opportunity: () => "Tests later pick-up coverage; check whether other schedule barriers remain.",
      assumptions: [
        "Assumes extended-hours care or a trusted helper is available — not verified.",
        "Any extra cost is not included.",
      ],
      nextAction: "Ask about extended-day care or a pick-up arrangement with family or a neighbor.",
      param: {
        label: "Childcare closing time",
        kind: "clock",
        min: plan.childcareClose,
        max: Math.min(23 * 60 + 45, needed + 60),
        step: 15,
        defaultValue: needed,
      },
      apply: (d, v) => ({ ...d, schedule: { ...d.schedule, childcareClose: toTimeString(v) } }),
    });
  }

  // 4. Lower childcare cost (offer costs more than today)
  if (key === "offer" && data.offer.childcareMonthly > data.currentJob.childcareMonthly) {
    const from = data.offer.childcareMonthly;
    const def = roundTo((from + data.currentJob.childcareMonthly) / 2, 25);
    defs.push({
      id: "childcare-cost",
      category: "childcare-cost",
      title: (v) => `Bring childcare to ${money(v)}/mo`,
      obstacle: `Childcare for this schedule is estimated at ${money(from)}/month, ${money(from - data.currentJob.childcareMonthly)} more than today.`,
      opportunity: (v) => `Recovers ${money(from - v)}/month of the offer's improvement.`,
      assumptions: [
        "No specific program, subsidy, or provider is assumed.",
        "Check any assistance eligibility with official sources — PivotPoint cannot determine it.",
      ],
      nextAction:
        "Compare licensed providers and ask about sliding-scale fees; check official childcare assistance information via Michigan 211.",
      param: {
        label: "Monthly childcare cost",
        kind: "monthly",
        min: 0,
        max: from,
        step: 25,
        defaultValue: def,
      },
      apply: (d, v) => withJob(d, "offer", { childcareMonthly: v }),
    });
  }

  // 5. Closer workplace (shorter commute; costs need a separate confirmed estimate)
  if (key === "offer" && data.offer.commuteMinutesRoundTrip > data.currentJob.commuteMinutesRoundTrip) {
    const from = data.offer.commuteMinutesRoundTrip;
    const def = Math.max(10, roundTo(data.currentJob.commuteMinutesRoundTrip, 5));
    defs.push({
      id: "closer-workplace",
      category: "commute",
      title: (v) => `Find a similar role ~${v} min round trip`,
      obstacle: `The offer's ${from}-minute round trip changes weekly commuting by ${c.deltas.weeklyCommuteHours.toFixed(1)} hours compared with today.`,
      opportunity: () => "Tests time saved by a shorter commute. Enter a confirmed transportation cost separately to estimate savings.",
      assumptions: [
        "Assumes a similar role exists closer to home — PivotPoint does not list job openings.",
        "Transportation cost stays unchanged: a shorter journey does not guarantee lower fares or fixed car costs.",
        "Same pay and shift as the current offer.",
      ],
      nextAction:
        "Search for the same job title closer to home through Detroit at Work or Michigan Works!, then compare it here.",
      param: {
        label: "Round-trip commute (minutes)",
        kind: "minutes",
        min: 10,
        max: from,
        step: 5,
        defaultValue: Math.min(def, from),
      },
      apply: (d, v) =>
        withJob(d, "offer", {
          commuteMinutesRoundTrip: v,
        }),
    });
  }

  // 6. Cheaper transportation arrangement
  if (job.transportationMonthly > 0) {
    const from = job.transportationMonthly;
    defs.push({
      id: "transportation",
      category: "transportation",
      title: (v) => `Cut commute cost to ${money(v)}/mo`,
      obstacle: `Getting to ${jobName} is estimated at ${money(from)}/month.`,
      opportunity: (v) => `Frees ${money(from - v)}/month through carpooling, transit, or a shared ride.`,
      assumptions: [
        "Savings depend on an arrangement you would have to find — none is verified.",
        "Commute time is assumed unchanged.",
      ],
      nextAction: "Ask coworkers about carpooling and check whether transit covers the shift times.",
      param: {
        label: "Monthly transportation cost",
        kind: "monthly",
        min: 0,
        max: from,
        step: 5,
        defaultValue: roundTo(from * 0.5, 5),
      },
      apply: (d, v) => withJob(d, key, { transportationMonthly: v }),
    });
  }

  // 7. Reduce one recurring expense
  const candidates: { field: keyof LifePathData["finances"]; label: string }[] = [
    { field: "otherExpenses", label: "other expenses" },
    { field: "food", label: "food costs" },
    { field: "utilities", label: "utilities" },
    { field: "debtPayments", label: "debt payments" },
  ];
  const largest = candidates
    .map((x) => ({ ...x, amount: Number(data.finances[x.field]) || 0 }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount)[0];
  if (largest) {
    defs.push({
      id: "reduce-expense",
      category: "expense",
      title: (v) => `Trim ${largest.label} by ${money(v)}/mo`,
      obstacle: `Your largest flexible expense is ${largest.label} at ${money(largest.amount)}/month.`,
      opportunity: (v) => `Adds ${money(v)}/month to remaining funds in any job.`,
      assumptions: ["You choose where to cut; no specific savings are guaranteed."],
      nextAction:
        largest.field === "debtPayments"
          ? "Call the lender to ask about payment options; consider free nonprofit credit counseling."
          : `Review last month's ${largest.label} and pick one recurring item to reduce.`,
      param: {
        label: `Monthly reduction in ${largest.label}`,
        kind: "monthly",
        min: 0,
        max: largest.amount,
        step: 5,
        defaultValue: Math.min(largest.amount, 50),
      },
      apply: (d, v) => ({
        ...d,
        finances: {
          ...d.finances,
          [largest.field]: Math.max(0, (Number(d.finances[largest.field]) || 0) - v),
        },
      }),
    });
  }

  return defs;
}

export function evaluateChange(
  data: LifePathData,
  def: ChangeDefinition,
  value: number,
  base: ScenarioOutcome = scenarioOutcome(data),
): EvaluatedChange {
  const outcome = scenarioOutcome(def.apply(data, value));
  const conflictKeys = (s: ScenarioOutcome) => new Set(hardConflicts(
    s.target === "offer" ? s.comparison.offerConflicts : s.comparison.currentConflicts,
  ).map((c) => `${c.kind}:${c.title}`));
  const before = conflictKeys(base);
  const after = conflictKeys(outcome);
  return {
    def,
    value,
    outcome,
    impact: {
      remainingDelta: outcome.remaining - base.remaining,
      weeklyHoursDelta: outcome.weeklyHours - base.weeklyHours,
      conflictsResolved: [...before].filter((c) => !after.has(c)).length,
      conflictsAdded: [...after].filter((c) => !before.has(c)).length,
    },
  };
}

/** Applies a set of changes (id -> value) to a copy of the scenario. */
export function applyChanges(
  data: LifePathData,
  applied: Record<string, number>,
  defs: ChangeDefinition[] = generateChanges(data),
): LifePathData {
  let next: LifePathData = { ...data };
  for (const def of defs) {
    const v = applied[def.id];
    if (v !== undefined) next = def.apply(next, v);
  }
  return next;
}

function score(e: EvaluatedChange): number {
  return (
    e.impact.conflictsResolved * 1000 -
    e.impact.conflictsAdded * 1000 +
    e.impact.remainingDelta -
    e.impact.weeklyHoursDelta * 5
  );
}

/**
 * Picks three diverse, high-impact changes: the best conflict-resolver,
 * the best financial improvement, then the next highest-impact change
 * from a different category.
 */
export function pickTopChanges(evaluated: EvaluatedChange[], count = 3): EvaluatedChange[] {
  const sorted = [...evaluated].sort((a, b) => score(b) - score(a));
  const picked: EvaluatedChange[] = [];
  const add = (e: EvaluatedChange | undefined) => {
    if (e && !picked.includes(e) && picked.length < count) picked.push(e);
  };
  add(sorted.find((e) => e.impact.conflictsResolved > 0));
  add(
    [...sorted]
      .filter((e) => e.impact.conflictsResolved === 0 && e.impact.remainingDelta > 0)
      .sort((a, b) => {
        // Prefer a wage negotiation when it is within ~25% of the best money change.
        const bonus = (x: EvaluatedChange) => (x.def.category === "wage" ? 1.25 : 1);
        return b.impact.remainingDelta * bonus(b) - a.impact.remainingDelta * bonus(a);
      })[0],
  );
  for (const e of sorted) {
    if (picked.length >= count) break;
    if (!picked.some((p) => p.def.category === e.def.category)) add(e);
  }
  for (const e of sorted) add(e);
  return picked;
}
