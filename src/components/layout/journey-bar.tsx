import { ArrowLeft, ArrowRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { JOURNEY_STEPS, useJourney } from "@/state/journey";
import { cn } from "@/lib/utils";

export function JourneyBar() {
  const j = useJourney();
  if (j.step == null || !j.current) return null;
  const last = j.step === JOURNEY_STEPS.length - 1;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-3">
      <div
        role="dialog"
        aria-label="Sample journey"
        className="pointer-events-auto animate-rise w-full max-w-xl rounded-2xl border border-navy-border bg-navy p-4 text-navy-foreground shadow-elevated sm:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-navy-muted">
              Sample journey · Step {j.step + 1} of {JOURNEY_STEPS.length}
            </div>
            <div className="text-base font-semibold">{j.current.title}</div>
          </div>
          <button
            onClick={j.exit}
            className="rounded-md p-1 text-navy-muted hover:bg-navy-foreground/10 hover:text-navy-foreground"
            aria-label="Exit sample journey"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-navy-muted">{j.current.body}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden>
            {JOURNEY_STEPS.map((_, i) => (
              <button
                key={i}
                tabIndex={-1}
                onClick={() => j.go(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === j.step ? "w-6 bg-primary" : i < (j.step ?? 0) ? "w-3 bg-success" : "w-3 bg-navy-border",
                )}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="hero-outline" onClick={j.back} disabled={j.step === 0}>
              <ArrowLeft aria-hidden /> Back
            </Button>
            <Button size="sm" onClick={j.next}>
              {last ? "Finish" : "Next"} {last ? null : <ArrowRight aria-hidden />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
