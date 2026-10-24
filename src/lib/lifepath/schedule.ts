// Deterministic schedule-conflict detection.
import { summarizeJob } from "./finance";
import type { HouseholdFinances, JobTerms, ScheduleConstraints } from "./types";
import {
  MINUTES_PER_DAY,
  formatClock,
  formatDuration,
  isOvernight,
  parseTime,
  shiftLengthMinutes,
} from "./time";

export type ConflictSeverity = "conflict" | "caution";
export type ConflictKind =
  | "childcare-dropoff"
  | "childcare-pickup"
  | "overnight-childcare"
  | "commitment"
  | "long-week"
  | "hours-mismatch"
  | "missing-times";

export interface ScheduleConflict {
  kind: ConflictKind;
  severity: ConflictSeverity;
  title: string;
  detail: string;
  /** Minutes of gap that would need to be closed (where meaningful) */
  gapMinutes?: number;
}

export interface DayPlan {
  shiftStart: number | null;
  shiftEnd: number | null;
  oneWayCommute: number;
  leaveHome: number | null;
  /** Latest time the child must be dropped off for this shift */
  dropoffBy: number | null;
  /** Earliest time the child can be picked up after this shift */
  pickupAt: number | null;
  childcareOpen: number | null;
  childcareClose: number | null;
  overnight: boolean;
}

export function planDay(job: JobTerms, schedule: ScheduleConstraints): DayPlan {
  const shiftStart = parseTime(job.shiftStart);
  const shiftEndRaw = parseTime(job.shiftEnd);
  const overnight = isOvernight(job.shiftStart, job.shiftEnd);
  const shiftEnd =
    shiftEndRaw == null ? null : overnight ? shiftEndRaw + MINUTES_PER_DAY : shiftEndRaw;
  const oneWayCommute = Math.max(0, job.commuteMinutesRoundTrip || 0) / 2;
  const leaveHome = shiftStart == null ? null : shiftStart - oneWayCommute;
  const dropoffBy =
    shiftStart == null
      ? null
      : shiftStart - oneWayCommute - Math.max(0, schedule.dropoffBufferMinutes || 0);
  const pickupAt =
    shiftEnd == null
      ? null
      : shiftEnd + oneWayCommute + Math.max(0, schedule.pickupBufferMinutes || 0);
  return {
    shiftStart,
    shiftEnd,
    oneWayCommute,
    leaveHome,
    dropoffBy,
    pickupAt,
    childcareOpen: parseTime(schedule.childcareOpen),
    childcareClose: parseTime(schedule.childcareClose),
    overnight,
  };
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function detectConflicts(
  job: JobTerms,
  schedule: ScheduleConstraints,
  finances?: HouseholdFinances,
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const plan = planDay(job, schedule);

  if (plan.shiftStart == null || plan.shiftEnd == null) {
    conflicts.push({
      kind: "missing-times",
      severity: "caution",
      title: "Shift times missing",
      detail: "Add shift start and end times to check for schedule conflicts.",
    });
    return conflicts;
  }

  if (schedule.needsChildcare && job.workDays.length > 0) {
    if (plan.overnight) {
      conflicts.push({
        kind: "overnight-childcare",
        severity: "conflict",
        title: "Overnight shift needs overnight care",
        detail: `This shift runs ${formatClock(plan.shiftStart)}–${formatClock(plan.shiftEnd)} overnight. Typical daytime childcare will not cover it.`,
      });
    } else {
      if (plan.childcareOpen != null && plan.dropoffBy != null && plan.dropoffBy < plan.childcareOpen) {
        const gap = plan.childcareOpen - plan.dropoffBy;
        conflicts.push({
          kind: "childcare-dropoff",
          severity: "conflict",
          title: "Shift starts before childcare opens",
          detail: `To start at ${formatClock(plan.shiftStart)} with a ${formatDuration(plan.oneWayCommute)} commute, drop-off would need to happen by ${formatClock(plan.dropoffBy)}. Childcare opens at ${formatClock(plan.childcareOpen)} — a ${formatDuration(gap)} gap.`,
          gapMinutes: gap,
        });
      }
      if (plan.childcareClose != null && plan.pickupAt != null && plan.pickupAt > plan.childcareClose) {
        const gap = plan.pickupAt - plan.childcareClose;
        conflicts.push({
          kind: "childcare-pickup",
          severity: "conflict",
          title: "Shift ends after childcare closes",
          detail: `Leaving at ${formatClock(plan.shiftEnd)} with a ${formatDuration(plan.oneWayCommute)} commute means pick-up around ${formatClock(plan.pickupAt)}. Childcare closes at ${formatClock(plan.childcareClose)} — a ${formatDuration(gap)} gap.`,
          gapMinutes: gap,
        });
      }
    }
  }

  // Fixed commitments overlapping the away-from-home window on work days.
  if (plan.leaveHome != null) {
    const awayStart = plan.leaveHome;
    const awayEnd = plan.shiftEnd + plan.oneWayCommute;
    for (const c of schedule.commitments) {
      const cs = parseTime(c.start);
      const ce = parseTime(c.end);
      if (cs == null || ce == null || ce <= cs) continue;
      const sharedDays = c.days.filter((d) => job.workDays.includes(d));
      if (sharedDays.length === 0) continue;
      if (overlaps(awayStart, awayEnd, cs, ce)) {
        conflicts.push({
          kind: "commitment",
          severity: "conflict",
          title: `Overlaps “${c.label || "fixed commitment"}”`,
          detail: `${c.label || "This commitment"} (${formatClock(cs)}–${formatClock(ce)} on ${sharedDays.join(", ")}) falls inside the time you'd be commuting or working (${formatClock(awayStart)}–${formatClock(awayEnd)}).`,
        });
      }
    }
  }

  if (finances) {
    const summary = summarizeJob(job, finances);
    if (summary.weeklyWorkAndCommuteHours > 55) {
      conflicts.push({
        kind: "long-week",
        severity: "caution",
        title: "Long week",
        detail: `Work plus commuting adds up to about ${summary.weeklyWorkAndCommuteHours.toFixed(1)} hours a week.`,
      });
    }
  }

  const length = shiftLengthMinutes(job.shiftStart, job.shiftEnd);
  if (length != null && job.workDays.length > 0 && job.hoursPerWeek > 0) {
    const scheduledHours = (length * job.workDays.length) / 60;
    if (Math.abs(scheduledHours - job.hoursPerWeek) > 2.5) {
      conflicts.push({
        kind: "hours-mismatch",
        severity: "caution",
        title: "Paid hours don't match shift times",
        detail: `Shift times add up to ${scheduledHours.toFixed(1)} hours a week, but paid hours are set to ${job.hoursPerWeek}. Unpaid breaks can explain a small difference; earnings use paid hours.`,
      });
    }
  }

  return conflicts;
}

export function hardConflicts(conflicts: ScheduleConflict[]): ScheduleConflict[] {
  return conflicts.filter((c) => c.severity === "conflict");
}
