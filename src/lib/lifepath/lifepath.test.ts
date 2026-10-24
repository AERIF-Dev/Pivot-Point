import { describe, expect, it } from "vitest";

import {
  applyChanges,
  evaluateChange,
  generateChanges,
  pickTopChanges,
  scenarioOutcome,
} from "./changes";
import { compareJobs } from "./compare";
import { WEEKS_PER_MONTH, monthlyGrossPay, summarizeJob, wageForRemaining } from "./finance";
import { createSampleData } from "./sample";
import { detectConflicts } from "./schedule";

describe("finance math", () => {
  it("uses 52/12 weeks per month", () => {
    expect(WEEKS_PER_MONTH).toBeCloseTo(4.3333, 4);
    expect(monthlyGrossPay(20, 40)).toBeCloseTo(3466.67, 2);
  });

  it("applies the 78% take-home assumption to the sample current job", () => {
    const d = createSampleData();
    const s = summarizeJob(d.currentJob, d.finances);
    expect(s.takeHomeMonthly).toBeCloseTo(2704, 0);
    expect(s.jobCostsMonthly).toBe(550);
    expect(s.weeklyCommuteHours).toBeCloseTo(3.33, 2);
  });
});

describe("sample job comparison", () => {
  const d = createSampleData();
  const c = compareJobs(d);

  it("shows the $5/hr raise shrinking to about $46/month after new costs", () => {
    expect(c.deltas.grossMonthly).toBeCloseTo(866.67, 1);
    expect(c.deltas.takeHomeMonthly).toBeCloseTo(676, 0);
    expect(c.deltas.jobCostsMonthly).toBe(630);
    expect(c.deltas.remainingMonthly).toBeCloseTo(46, 0);
  });

  it("adds 5 hours of commuting per week", () => {
    expect(c.deltas.weeklyCommuteHours).toBeCloseTo(5, 5);
  });

  it("computes a break-even wage of about $24.66/hr", () => {
    expect(c.breakEvenWage).toBeCloseTo(24.66, 2);
  });

  it("computes the wage needed for a $300/month improvement", () => {
    expect(c.targetWage).toBeCloseTo(26.88, 2);
  });

  it("flags the 6 AM shift as a childcare conflict", () => {
    expect(c.offerConflicts.some((x) => x.kind === "childcare-dropoff")).toBe(true);
    expect(c.currentConflicts.some((x) => x.severity === "conflict")).toBe(false);
    expect(c.verdict).toBe("schedule-conflict");
    expect(c.financialVerdict).toBe("better");
  });

  it("break-even wage really matches current remaining funds", () => {
    const at = { ...d, offer: { ...d.offer, hourlyWage: c.breakEvenWage! } };
    expect(compareJobs(at).deltas.remainingMonthly).toBeCloseTo(0, 6);
  });

  it("returns insufficient when the offer has no pay", () => {
    const blank = { ...d, offer: { ...d.offer, hourlyWage: 0 } };
    expect(compareJobs(blank).verdict).toBe("insufficient");
  });

  it("wageForRemaining returns null when there are no paid hours", () => {
    expect(wageForRemaining({ ...d.offer, hoursPerWeek: 0 }, d.finances, 0)).toBeNull();
  });
});

describe("schedule conflicts", () => {
  it("detects a pick-up conflict when the shift ends too late", () => {
    const d = createSampleData();
    const late = { ...d.offer, shiftStart: "10:00", shiftEnd: "18:00" };
    expect(detectConflicts(late, d.schedule).some((x) => x.kind === "childcare-pickup")).toBe(true);
  });

  it("detects an overlap with a fixed commitment on a work day", () => {
    const d = createSampleData();
    const schedule = {
      ...d.schedule,
      commitments: [{ id: "a", label: "Class", days: ["Tue" as const], start: "15:00", end: "16:00" }],
    };
    expect(detectConflicts(d.currentJob, schedule).some((x) => x.kind === "commitment")).toBe(true);
  });
});

describe("One Change Away", () => {
  const d = createSampleData();
  const defs = generateChanges(d);
  const base = scenarioOutcome(d);
  const byId = (id: string) => defs.find((x) => x.id === id)!;

  it("a negotiated wage improves finances but does not resolve the schedule conflict", () => {
    const e = evaluateChange(d, byId("negotiate-wage"), 27, base);
    expect(e.impact.remainingDelta).toBeCloseTo(2 * 40 * WEEKS_PER_MONTH * 0.78, 4);
    expect(e.impact.conflictsResolved).toBe(0);
    expect(e.outcome.verdict).toBe("schedule-conflict");
  });

  it("an 8 AM start resolves the childcare conflict", () => {
    const def = byId("later-shift");
    expect(def.param.defaultValue).toBe(8 * 60);
    const e = evaluateChange(d, def, def.param.defaultValue, base);
    expect(e.impact.conflictsResolved).toBe(1);
    expect(e.outcome.verdict).toBe("better");
  });

  it("childcare opening by 5:00 AM resolves the conflict", () => {
    const def = byId("earlier-childcare");
    expect(def.param.defaultValue).toBe(5 * 60);
    expect(evaluateChange(d, def, def.param.defaultValue, base).impact.conflictsResolved).toBe(1);
  });

  it("top three are a conflict fix, a wage negotiation, and a different fix", () => {
    const top = pickTopChanges(defs.map((x) => evaluateChange(d, x, x.param.defaultValue, base)));
    expect(top.map((t) => t.def.id)).toEqual(["later-shift", "negotiate-wage", "earlier-childcare"]);
  });

  it("applying changes never mutates the original scenario", () => {
    const next = applyChanges(d, { "negotiate-wage": 30, "later-shift": 480 }, defs);
    expect(next.offer.hourlyWage).toBe(30);
    expect(next.offer.shiftStart).toBe("08:00");
    expect(d.offer.hourlyWage).toBe(25);
    expect(d.offer.shiftStart).toBe("06:00");
  });
});
