// Builds minimized, sanitized AI inputs. Only what each operation needs is sent:
// no nickname, no exact living expenses, no household details beyond summaries.
import type { Comparison } from "../lifepath/compare";
import type { EvaluatedChange } from "../lifepath/changes";
import type { CareerProfile, LifePathData } from "../lifepath/types";
import type { InputOf } from "./contract";

const clip = (v: string | undefined, max: number) => (v ?? "").slice(0, max);
const r = (v: number) => Math.round(v * 100) / 100;

export function profileForAi(p: CareerProfile): InputOf<"extract_skills">["profile"] {
  return {
    currentTitle: clip(p.currentTitle, 200),
    previousJobs: clip(p.previousJobs, 600),
    yearsExperience: Math.min(70, Math.max(0, Number(p.yearsExperience) || 0)),
    tasks: clip(p.tasks, 2000),
    tools: clip(p.tools, 800),
    skillsAndCerts: clip(p.skillsAndCerts, 600),
    preferredWorkTypes: clip(p.preferredWorkTypes, 300),
    interests: clip(p.interests, 400),
    location: clip(p.location, 80),
    ownWords: clip(p.ownWords, 1500),
  };
}

export function comparisonFigures(c: Comparison): Record<string, number> {
  return {
    currentHourlyWage: r(c.current.grossMonthly > 0 ? c.current.grossMonthly / (c.current.weeklyPaidHours * (52 / 12)) : 0),
    offerHourlyWage: r(c.offer.weeklyPaidHours > 0 ? c.offer.grossMonthly / (c.offer.weeklyPaidHours * (52 / 12)) : 0),
    monthlyTakeHomeChange: Math.round(c.deltas.spendableMonthly),
    monthlyJobCostChange: Math.round(c.deltas.jobCostsMonthly),
    monthlyRemainingFundsChange: Math.round(c.deltas.remainingMonthly),
    weeklyCommuteHoursChange: r(c.deltas.weeklyCommuteHours),
    weeklyWorkAndCommuteHoursOffer: r(c.offer.weeklyWorkAndCommuteHours),
    breakEvenHourlyWage: r(c.breakEvenWage ?? 0),
    targetMonthlyImprovement: Math.round(c.targetImprovementMonthly),
    hourlyWageForTarget: r(c.targetWage ?? 0),
  };
}

export function explainInput(data: LifePathData, c: Comparison): InputOf<"explain_scenario"> {
  return {
    currentTitle: clip(data.currentJob.title || data.profile.currentTitle, 120),
    offerTitle: clip(data.offer.title, 120),
    figures: comparisonFigures(c),
    conflicts: c.offerConflicts.slice(0, 8).map((x) => clip(`${x.title}: ${x.detail}`, 400)),
    verdict: c.verdict,
    calculatorSummary: clip(c.explanation, 700),
  };
}

export function barriersInput(
  data: LifePathData,
  c: Comparison,
  changes: EvaluatedChange[],
): InputOf<"identify_barriers"> {
  return {
    figures: comparisonFigures(c),
    conflicts: c.offerConflicts.slice(0, 8).map((x) => clip(`${x.title}: ${x.detail}`, 400)),
    priorities: data.schedule.priorities.slice(0, 6).map((p) => clip(p, 120)),
    calculatedChanges: changes.slice(0, 10).map((e) =>
      clip(
        `${e.def.title(e.value)} → remaining funds ${Math.round(e.impact.remainingDelta) >= 0 ? "+" : ""}${Math.round(e.impact.remainingDelta)}/mo, resolves ${e.impact.conflictsResolved} conflict(s)`,
        240,
      ),
    ),
    careerInterests: clip(data.profile.interests, 400),
    currentTitle: clip(data.currentJob.title || data.profile.currentTitle, 120),
    offerTitle: clip(data.offer.title, 120),
  };
}
