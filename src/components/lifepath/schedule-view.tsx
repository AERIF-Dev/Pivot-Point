import { AlertOctagon, AlertTriangle, CheckCircle2 } from "lucide-react";

import { planDay, type ScheduleConflict } from "@/lib/lifepath/schedule";
import { formatClock } from "@/lib/lifepath/time";
import type { JobTerms, ScheduleConstraints } from "@/lib/lifepath/types";
import { cn } from "@/lib/utils";

interface Row {
  label: string;
  job: JobTerms;
}

export function DayTimeline({
  rows,
  schedule,
  className,
}: {
  rows: Row[];
  schedule: ScheduleConstraints;
  className?: string;
}) {
  const plans = rows.map((r) => ({ ...r, plan: planDay(r.job, schedule) }));
  const points: number[] = [6 * 60, 18 * 60];
  for (const { plan } of plans) {
    if (plan.leaveHome != null) points.push(plan.leaveHome);
    if (plan.dropoffBy != null) points.push(plan.dropoffBy);
    if (plan.shiftEnd != null) points.push(plan.shiftEnd + plan.oneWayCommute);
  }
  const open = plans[0]?.plan.childcareOpen;
  const close = plans[0]?.plan.childcareClose;
  if (schedule.needsChildcare && open != null) points.push(open);
  if (schedule.needsChildcare && close != null) points.push(close);
  const start = Math.max(0, Math.floor((Math.min(...points) - 30) / 60) * 60);
  const end = Math.min(30 * 60, Math.ceil((Math.max(...points) + 30) / 60) * 60);
  const span = end - start;
  const pct = (m: number) => `${((Math.min(end, Math.max(start, m)) - start) / span) * 100}%`;
  const width = (a: number, b: number) =>
    `${((Math.min(end, Math.max(start, b)) - Math.min(end, Math.max(start, a))) / span) * 100}%`;
  const ticks: number[] = [];
  for (let t = start; t <= end; t += span > 14 * 60 ? 120 : 60) ticks.push(t);

  return (
    <div className={cn("space-y-3", className)} aria-label="Daily schedule timeline">
      <div className="relative ml-28 h-5 text-[10px] text-muted-foreground sm:ml-36">
        {ticks.map((t) => (
          <span key={t} className="absolute -translate-x-1/2 tabular" style={{ left: pct(t) }}>
            {formatClock(t).replace(":00", "")}
          </span>
        ))}
      </div>

      {schedule.needsChildcare && open != null && close != null ? (
        <div className="flex items-center gap-3">
          <div className="w-25 shrink-0 text-xs font-medium text-muted-foreground sm:w-33">Childcare open</div>
          <div className="relative h-7 flex-1 rounded-md bg-muted">
            <div
              className="absolute inset-y-0 rounded-md border border-success/40 bg-success-soft"
              style={{ left: pct(open), width: width(open, close) }}
            />
            <span
              className="absolute inset-y-0 flex items-center pl-2 text-[11px] font-medium text-success"
              style={{ left: pct(open) }}
            >
              {formatClock(open)}–{formatClock(close)}
            </span>
          </div>
        </div>
      ) : null}

      {plans.map(({ label, plan }) => {
        const dropGap =
          schedule.needsChildcare && open != null && plan.dropoffBy != null && plan.dropoffBy < open;
        const pickGap =
          schedule.needsChildcare && close != null && plan.pickupAt != null && plan.pickupAt > close;
        return (
          <div key={label} className="flex items-center gap-3">
            <div className="w-25 shrink-0 truncate text-xs font-semibold text-foreground sm:w-33" title={label}>
              {label}
            </div>
            <div className="relative h-9 flex-1 rounded-md bg-muted">
              {plan.shiftStart != null && plan.shiftEnd != null ? (
                <>
                  {dropGap && plan.dropoffBy != null && open != null ? (
                    <div
                      className="absolute inset-y-0 rounded-md bg-destructive/15 ring-1 ring-destructive/40"
                      style={{ left: pct(plan.dropoffBy), width: width(plan.dropoffBy, open) }}
                      title="Gap before childcare opens"
                    />
                  ) : null}
                  {pickGap && plan.pickupAt != null && close != null ? (
                    <div
                      className="absolute inset-y-0 rounded-md bg-destructive/15 ring-1 ring-destructive/40"
                      style={{ left: pct(close), width: width(close, plan.pickupAt) }}
                      title="Gap after childcare closes"
                    />
                  ) : null}
                  <div
                    className="absolute inset-y-2 rounded bg-chart-5/40"
                    style={{ left: pct(plan.shiftStart - plan.oneWayCommute), width: width(plan.shiftStart - plan.oneWayCommute, plan.shiftStart) }}
                    title="Commute"
                  />
                  <div
                    className="absolute inset-y-1 flex items-center justify-center overflow-hidden rounded-md bg-primary px-1 text-[11px] font-semibold text-primary-foreground"
                    style={{ left: pct(plan.shiftStart), width: width(plan.shiftStart, plan.shiftEnd) }}
                  >
                    <span className="truncate tabular">
                      {formatClock(plan.shiftStart)}–{formatClock(plan.shiftEnd)}
                    </span>
                  </div>
                  <div
                    className="absolute inset-y-2 rounded bg-chart-5/40"
                    style={{ left: pct(plan.shiftEnd), width: width(plan.shiftEnd, plan.shiftEnd + plan.oneWayCommute) }}
                    title="Commute"
                  />
                </>
              ) : (
                <span className="flex h-full items-center px-3 text-xs text-muted-foreground">Add shift times</span>
              )}
            </div>
          </div>
        );
      })}

      <div className="ml-28 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground sm:ml-36">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-primary" />Shift</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-chart-5/40" />Commute (one way)</span>
        {schedule.needsChildcare ? (
          <>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm border border-success/40 bg-success-soft" />Childcare hours</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-destructive/15 ring-1 ring-destructive/40" />Coverage gap</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function ConflictList({
  conflicts,
  emptyLabel = "No schedule conflicts found with the times entered.",
}: {
  conflicts: ScheduleConflict[];
  emptyLabel?: string;
}) {
  if (conflicts.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft p-3 text-sm text-success">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
        {emptyLabel}
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {conflicts.map((c, i) => (
        <li
          key={`${c.kind}-${i}`}
          className={cn(
            "flex items-start gap-3 rounded-lg border p-3",
            c.severity === "conflict"
              ? "border-destructive/30 bg-destructive-soft"
              : "border-warning/40 bg-warning-soft",
          )}
        >
          {c.severity === "conflict" ? (
            <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-strong" aria-hidden />
          )}
          <div>
            <div
              className={cn(
                "text-sm font-semibold",
                c.severity === "conflict" ? "text-destructive" : "text-warning-strong",
              )}
            >
              {c.title}
            </div>
            <div className="text-sm text-foreground/80">{c.detail}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
