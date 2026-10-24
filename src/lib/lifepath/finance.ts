// Deterministic financial calculations. AI never produces these numbers.
import type { HouseholdFinances, JobTerms } from "./types";

/** 52 weeks / 12 months */
export const WEEKS_PER_MONTH = 52 / 12;

const num = (v: number | undefined | null): number => (Number.isFinite(v) ? Number(v) : 0);
const nonNeg = (v: number | undefined | null): number => Math.max(0, num(v));

export function monthlyGrossPay(hourlyWage: number, hoursPerWeek: number): number {
  return nonNeg(hourlyWage) * nonNeg(hoursPerWeek) * WEEKS_PER_MONTH;
}

/** Applies the adjustable take-home assumption. This is NOT a tax calculation. */
export function estimatedTakeHome(grossMonthly: number, takeHomePercent: number): number {
  const pct = Math.min(100, nonNeg(takeHomePercent));
  return nonNeg(grossMonthly) * (pct / 100);
}

/** Living expenses that stay the same regardless of which job is held. */
export function baseLivingExpenses(f: HouseholdFinances): number {
  return (
    nonNeg(f.housing) +
    nonNeg(f.utilities) +
    nonNeg(f.food) +
    nonNeg(f.insurance) +
    nonNeg(f.debtPayments) +
    nonNeg(f.otherExpenses)
  );
}

/** Expenses that exist because of a specific job (and disappear when leaving it). */
export function jobRelatedCosts(job: JobTerms): number {
  return (
    nonNeg(job.transportationMonthly) +
    nonNeg(job.childcareMonthly) +
    nonNeg(job.otherJobCostsMonthly)
  );
}

export function workDayCount(job: JobTerms): number {
  return new Set(job.workDays).size;
}

export function weeklyCommuteHours(job: JobTerms): number {
  return (nonNeg(job.commuteMinutesRoundTrip) * workDayCount(job)) / 60;
}

export interface JobSummary {
  grossMonthly: number;
  takeHomeMonthly: number;
  otherIncomeMonthly: number;
  benefitsMonthlyChange: number;
  totalSpendableMonthly: number;
  baseExpensesMonthly: number;
  jobCostsMonthly: number;
  totalExpensesMonthly: number;
  remainingMonthly: number;
  weeklyPaidHours: number;
  weeklyCommuteHours: number;
  weeklyWorkAndCommuteHours: number;
  workDays: number;
}

export function summarizeJob(job: JobTerms, finances: HouseholdFinances): JobSummary {
  const grossMonthly = monthlyGrossPay(job.hourlyWage, job.hoursPerWeek);
  const takeHomeMonthly = estimatedTakeHome(grossMonthly, finances.takeHomePercent);
  const otherIncomeMonthly = nonNeg(finances.secondIncomeMonthly);
  const benefitsMonthlyChange = num(job.benefitsMonthlyChange);
  const totalSpendableMonthly = takeHomeMonthly + otherIncomeMonthly + benefitsMonthlyChange;
  const baseExpensesMonthly = baseLivingExpenses(finances);
  const jobCostsMonthly = jobRelatedCosts(job);
  const totalExpensesMonthly = baseExpensesMonthly + jobCostsMonthly;
  const commute = weeklyCommuteHours(job);
  const paid = nonNeg(job.hoursPerWeek);
  return {
    grossMonthly,
    takeHomeMonthly,
    otherIncomeMonthly,
    benefitsMonthlyChange,
    totalSpendableMonthly,
    baseExpensesMonthly,
    jobCostsMonthly,
    totalExpensesMonthly,
    remainingMonthly: totalSpendableMonthly - totalExpensesMonthly,
    weeklyPaidHours: paid,
    weeklyCommuteHours: commute,
    weeklyWorkAndCommuteHours: paid + commute,
    workDays: workDayCount(job),
  };
}

export interface ExpenseLine {
  key: string;
  label: string;
  amount: number;
  jobRelated: boolean;
}

export function expenseBreakdown(job: JobTerms, f: HouseholdFinances): ExpenseLine[] {
  return [
    { key: "housing", label: "Housing", amount: nonNeg(f.housing), jobRelated: false },
    { key: "utilities", label: "Utilities", amount: nonNeg(f.utilities), jobRelated: false },
    { key: "food", label: "Food", amount: nonNeg(f.food), jobRelated: false },
    {
      key: "transportation",
      label: "Transportation",
      amount: nonNeg(job.transportationMonthly),
      jobRelated: true,
    },
    { key: "childcare", label: "Childcare", amount: nonNeg(job.childcareMonthly), jobRelated: true },
    { key: "debt", label: "Debt payments", amount: nonNeg(f.debtPayments), jobRelated: false },
    { key: "insurance", label: "Insurance", amount: nonNeg(f.insurance), jobRelated: false },
    {
      key: "jobOther",
      label: "Other job costs",
      amount: nonNeg(job.otherJobCostsMonthly),
      jobRelated: true,
    },
    { key: "other", label: "Other", amount: nonNeg(f.otherExpenses), jobRelated: false },
  ];
}

/**
 * Hourly wage at which `job` produces `targetRemaining` monthly remaining funds.
 * Returns null when it cannot be computed (no hours, or 0% take-home).
 */
export function wageForRemaining(
  job: JobTerms,
  finances: HouseholdFinances,
  targetRemaining: number,
): number | null {
  const pct = Math.min(100, nonNeg(finances.takeHomePercent)) / 100;
  const denominator = nonNeg(job.hoursPerWeek) * WEEKS_PER_MONTH * pct;
  if (denominator <= 0) return null;
  const needed =
    targetRemaining -
    nonNeg(finances.secondIncomeMonthly) -
    num(job.benefitsMonthlyChange) +
    baseLivingExpenses(finances) +
    jobRelatedCosts(job);
  return Math.max(0, needed / denominator);
}
