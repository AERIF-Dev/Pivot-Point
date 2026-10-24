import { Link } from "@tanstack/react-router";
import { ArrowRight, Info, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useLifePath } from "@/state/lifepath-store";
import { cn } from "@/lib/utils";

export function PageHeader({
  stage,
  eyebrow,
  title,
  description,
  actions,
  id,
}: {
  stage?: number;
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  id?: string;
}) {
  return (
    <header id={id} className="scroll-mt-24 border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8 lg:py-10">
        <div className="max-w-2xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            {stage ? (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft text-[11px] text-accent-foreground">
                {stage}
              </span>
            ) : null}
            {eyebrow}
          </div>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
          {description ? (
            <p className="text-base leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10", className)}>
      {children}
    </div>
  );
}

export function Panel({
  title,
  description,
  icon,
  actions,
  children,
  className,
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("surface scroll-mt-24 p-5 sm:p-6", className)}>
      {title || actions ? (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {icon ? (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-accent-foreground">
                {icon}
              </div>
            ) : null}
            <div>
              {title ? <h2 className="text-lg font-semibold text-foreground">{title}</h2> : null}
              {description ? (
                <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export type Tone = "neutral" | "positive" | "negative" | "caution" | "info";

const toneText: Record<Tone, string> = {
  neutral: "text-foreground",
  positive: "text-success",
  negative: "text-destructive",
  caution: "text-warning-strong",
  info: "text-primary",
};

export function toneFor(value: number, threshold = 0.5): Tone {
  if (value > threshold) return "positive";
  if (value < -threshold) return "negative";
  return "neutral";
}

export function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
  assumption,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  assumption?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface flex flex-col gap-1 p-4", className)}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("tabular text-2xl font-bold", toneText[tone])}>{value}</div>
      {sub ? <div className="text-sm text-muted-foreground">{sub}</div> : null}
      {assumption ? (
        <div className="mt-1 flex items-start gap-1 text-[11px] leading-snug text-muted-foreground">
          <Info className="mt-px h-3 w-3 shrink-0" aria-hidden />
          <span>{assumption}</span>
        </div>
      ) : null}
    </div>
  );
}

export function SampleBanner() {
  const { data, startFresh, hydrated } = useLifePath();
  if (!hydrated || !data.isSample) return null;
  return (
    <div className="border-b border-warning/30 bg-warning-soft">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm text-warning-foreground sm:px-6 lg:px-8">
        <p className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-warning-strong" aria-hidden />
          <span>
            <strong className="font-semibold">Fictional sample resident.</strong> Every number is illustrative and
            editable.
          </span>
        </p>
        <Button size="sm" variant="ghost" onClick={startFresh} className="text-warning-foreground">
          Start with my own info
        </Button>
      </div>
    </div>
  );
}

export function NextStage({
  to,
  label,
  description,
}: {
  to: "/profile" | "/skills" | "/finances" | "/job-lab" | "/one-change" | "/about";
  label: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group surface flex items-center justify-between gap-4 p-5 transition-shadow hover:shadow-elevated"
    >
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-primary">Next</div>
        <div className="mt-1 text-lg font-semibold text-foreground">{label}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
      <ArrowRight className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

export function Assumption({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
