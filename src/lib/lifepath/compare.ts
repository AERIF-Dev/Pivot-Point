// Deterministic "Can I actually take this job?" comparison.
import { summarizeJob, wageForRemaining, type JobSummary } from "./finance";
import { money } from "./format";
import { detectConflicts, hardConflicts, type ScheduleConflict } from "./schedule";
import type { LifePathData } from "./types";

export type FinancialVerdict = "better" | "worse" | "about-same" | "insufficient";
export type Verdict = FinancialVerdict | "schedule-conflict";

/** Differences under this many dollars per month are treated as "about the same". */
export const ABOUT_SAME_THRESHOLD = 10;

export interface ComparisonDeltas {
  grossMonthly: number;
  takeHomeMonthly: number;
  spendableMonthly: number;
  jobCostsMonthly: number;
  remainingMonthly: number;
  weeklyCommuteHours: number;
  weeklyWorkAndCommuteHours: number;
  weeklyPaidHours: number;
}

export interface Comparison {
  current: JobSummary;
  offer: JobSummary;
  currentConflicts: ScheduleConflict[];
  offerConflicts: ScheduleConflict[];
  deltas: ComparisonDeltas;
  /** Hourly wage at which the offer matches current remaining funds */
  breakEvenWage: number | null;
  /** Hourly wage at which the offer beats current remaining funds by the target */
  targetWage: number | null;
  targetImprovementMonthly: number;
  financialVerdict: FinancialVerdict;
  verdict: Verdict;
  explanation: string;
}

export function hasEnoughOfferInfo(data: LifePathData): boolean {
  return Number.isFinite(data.offer.hourlyWage) && data.offer.hourlyWage > 0 &&
    Number.isFinite(data.offer.hoursPerWeek) && data.offer.hoursPerWeek > 0;
}

function costIncreaseLabel(data: LifePathData): string {
  const parts: string[] = [];
  if (data.offer.childcareMonthly > data.currentJob.childcareMonthly) parts.push("childcare");
  if (data.offer.transportationMonthly > data.currentJob.transportationMonthly)
    parts.push("commuting");
  if (data.offer.otherJobCostsMonthly > data.currentJob.otherJobCostsMonthly)
    parts.push("other job-related");
  if (parts.length === 0) return "job-related";
  if (parts.length === 1) return parts[0] ?? "job-related";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export function explainComparison(data: LifePathData, c: Omit<Comparison, "explanation">): string {
  if (c.financialVerdict === "insufficient") {
    return "Add the offered hourly pay and paid hours per week to compare this job with your current situation.";
  }
  const sp = c.deltas.spendableMonthly;
  const cost = c.deltas.jobCostsMonthly;
  const rem = c.deltas.remainingMonthly;
  const incomeLabel = c.offer.benefitsMonthlyChange !== c.current.benefitsMonthlyChange
    ? "spendable income (estimated take-home plus benefit changes)"
    : "take-home pay";
  let sentence: string;
  if (sp > 0 && cost > 0) {
    sentence = `This offer increases your estimated monthly ${incomeLabel} by ${money(sp)}, but additional ${costIncreaseLabel(data)} expenses (${money(cost)}) ${
      rem >= 0
        ? `reduce the improvement to ${money(rem)}.`
        : `turn it into an estimated shortfall of ${money(-rem)} a month.`
    }`;
  } else if (sp > 0) {
    sentence = `This offer increases your estimated monthly ${incomeLabel} by ${money(sp)}${
      cost < 0 ? ` and lowers job-related costs by ${money(-cost)}` : ""
    }, for an estimated improvement of ${money(rem)} a month.`;
  } else if (sp < 0) {
    sentence = `This offer lowers your estimated monthly ${incomeLabel} by ${money(-sp)}${
      cost < 0 ? `, partly offset by ${money(-cost)} lower job-related costs` : ""
    }, so remaining funds change by ${rem >= 0 ? "+" : "−"}${money(Math.abs(rem))} a month.`;
  } else {
    sentence = `Estimated ${incomeLabel} stays about the same; remaining funds change by ${rem >= 0 ? "+" : "−"}${money(Math.abs(rem))} a month because of job-related costs.`;
  }
  const commute = c.deltas.weeklyCommuteHours;
  if (Math.abs(commute) >= 0.25) {
    sentence += ` It also ${commute > 0 ? "adds" : "saves"} about ${Math.abs(commute).toFixed(1)} hours of commuting per week.`;
  }
  const hard = hardConflicts(c.offerConflicts);
  if (hard.length > 0) {
    sentence += ` There ${hard.length === 1 ? "is 1 schedule conflict" : `are ${hard.length} schedule conflicts`} to resolve first.`;
  }
  if (c.offerConflicts.some((x) => x.kind === "missing-times")) {
    sentence += " Schedule feasibility is unknown until missing schedule details are entered.";
  }
  return sentence;
}

export function compareJobs(data: LifePathData): Comparison {
  const current = summarizeJob(data.currentJob, data.finances);
  const offer = summarizeJob(data.offer, data.finances);
  const currentConflicts = detectConflicts(data.currentJob, data.schedule, data.finances);
  const offerConflicts = detectConflicts(data.offer, data.schedule, data.finances);
  const deltas: ComparisonDeltas = {
    grossMonthly: offer.grossMonthly - current.grossMonthly,
    takeHomeMonthly: offer.takeHomeMonthly - current.takeHomeMonthly,
    spendableMonthly: offer.totalSpendableMonthly - current.totalSpendableMonthly,
    jobCostsMonthly: offer.jobCostsMonthly - current.jobCostsMonthly,
    remainingMonthly: offer.remainingMonthly - current.remainingMonthly,
    weeklyCommuteHours: offer.weeklyCommuteHours - current.weeklyCommuteHours,
    weeklyWorkAndCommuteHours: offer.weeklyWorkAndCommuteHours - current.weeklyWorkAndCommuteHours,
    weeklyPaidHours: offer.weeklyPaidHours - current.weeklyPaidHours,
  };
  const enough = hasEnoughOfferInfo(data);
  const target = Math.max(0, data.targetImprovementMonthly || 0);
  const breakEvenWage = enough
    ? wageForRemaining(data.offer, data.finances, current.remainingMonthly)
    : null;
  const targetWage = enough
    ? wageForRemaining(data.offer, data.finances, current.remainingMonthly + target)
    : null;

  let financialVerdict: FinancialVerdict;
  if (!enough) financialVerdict = "insufficient";
  else if (deltas.remainingMonthly >= ABOUT_SAME_THRESHOLD) financialVerdict = "better";
  else if (deltas.remainingMonthly <= -ABOUT_SAME_THRESHOLD) financialVerdict = "worse";
  else financialVerdict = "about-same";

  const verdict: Verdict =
    financialVerdict === "insufficient"
      ? "insufficient"
      : hardConflicts(offerConflicts).length > 0
        ? "schedule-conflict"
        : financialVerdict;

  const partial = {
    current,
    offer,
    currentConflicts,
    offerConflicts,
    deltas,
    breakEvenWage,
    targetWage,
    targetImprovementMonthly: target,
    financialVerdict,
    verdict,
  };
  return { ...partial, explanation: explainComparison(data, partial) };
}

export const VERDICT_LABELS: Record<Verdict, string> = {
  better: "Financially better under current assumptions",
  worse: "Financially worse under current assumptions",
  "about-same": "About the same financially under current assumptions",
  "schedule-conflict": "Scheduling conflict needs resolution",
  insufficient: "Insufficient information",
};

export const FINANCIAL_VERDICT_LABELS: Record<FinancialVerdict, string> = {
  better: "Financially better under current assumptions",
  worse: "Financially worse under current assumptions",
  "about-same": "About the same financially",
  insufficient: "Insufficient information",
};
