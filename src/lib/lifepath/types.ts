// Framework-neutral domain types for LifePath AI.
// Nothing in src/lib/lifepath imports React, the router, or any backend SDK,
// so these modules can be reused by a Cloudflare Worker, a CLI, or tests.

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** Terms of one job (current or prospective). All money values are monthly USD. */
export interface JobTerms {
  title: string;
  hourlyWage: number;
  hoursPerWeek: number;
  /** "HH:MM" 24-hour clock */
  shiftStart: string;
  shiftEnd: string;
  workDays: Weekday[];
  /** Round-trip commute per working day, in minutes */
  commuteMinutesRoundTrip: number;
  transportationMonthly: number;
  childcareMonthly: number;
  otherJobCostsMonthly: number;
  /**
   * Monthly change in benefits value vs. today. Positive = saves money
   * (e.g. employer pays more of insurance), negative = costs more.
   */
  benefitsMonthlyChange: number;
  benefitsNote: string;
}

export interface CareerProfile {
  nickname: string;
  currentTitle: string;
  previousJobs: string;
  yearsExperience: number;
  tasks: string;
  tools: string;
  skillsAndCerts: string;
  preferredWorkTypes: string;
  interests: string;
  /** City / region only — never a street address */
  location: string;
  /** Free-form "in your own words" description */
  ownWords: string;
}

/** Household finances that do not depend on which job is held. */
export interface HouseholdFinances {
  /** Adjustable assumption, NOT a tax calculation. */
  takeHomePercent: number;
  /** Other household income per month, after taxes (optional) */
  secondIncomeMonthly: number;
  housing: number;
  utilities: number;
  food: number;
  insurance: number;
  debtPayments: number;
  otherExpenses: number;
}

export interface FixedCommitment {
  id: string;
  label: string;
  days: Weekday[];
  start: string;
  end: string;
}

export interface ScheduleConstraints {
  needsChildcare: boolean;
  childcareOpen: string;
  childcareClose: string;
  /** Minutes needed at childcare for drop-off */
  dropoffBufferMinutes: number;
  /** Minutes needed at childcare for pick-up */
  pickupBufferMinutes: number;
  commitments: FixedCommitment[];
  priorities: string[];
}

export type AiOperation =
  | "extract_skills"
  | "suggest_careers"
  | "explain_scenario"
  | "identify_barriers"
  | "generate_action_plan";

export interface StoredAiResult {
  source: "gemma" | "fixture";
  model: string;
  createdAt: string;
  data: unknown;
}

export interface LifePathData {
  version: 1;
  isSample: boolean;
  profile: CareerProfile;
  finances: HouseholdFinances;
  schedule: ScheduleConstraints;
  currentJob: JobTerms;
  offer: JobTerms;
  /** Desired monthly improvement in remaining funds (user-defined) */
  targetImprovementMonthly: number;
  /** One Change Away: applied change id -> parameter value */
  appliedChanges: Record<string, number>;
  ai: Partial<Record<AiOperation, StoredAiResult>>;
}
