import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  Lightbulb,
  PlayCircle,
  Scale,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";

import heroImage from "@/assets/hero-worker.jpg";
import { Button } from "@/components/ui/button";
import { compareJobs } from "@/lib/lifepath/compare";
import { money, signedMoney, wage } from "@/lib/lifepath/format";
import { createSampleData } from "@/lib/lifepath/sample";
import { useJourney } from "@/state/journey";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LifePath AI — A better job doesn't always mean a better life" },
      {
        name: "description",
        content:
          "Discover transferable skills, compare job offers on real costs and schedules, and find the one change that unlocks a better opportunity.",
      },
      { property: "og:title", content: "LifePath AI — A better job doesn't always mean a better life" },
      {
        property: "og:description",
        content:
          "Skills, income, expenses, schedule, and goals in one place. Built for Hack for Humanity Detroit 2026.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const sample = compareJobs(createSampleData());

const STAGES = [
  { n: 1, to: "/profile", icon: UserRound, title: "Tell LifePath about yourself", body: "Your jobs, real tasks, tools, pay, and schedule — in a form or your own words." },
  { n: 2, to: "/skills", icon: Lightbulb, title: "Discover transferable skills", body: "Gemma 4 maps the work you've actually done to other career paths." },
  { n: 3, to: "/finances", icon: Wallet, title: "See your real finances & time", body: "Income, expenses, commute, and childcare in one honest dashboard." },
  { n: 4, to: "/job-lab", icon: Scale, title: "Can I actually take this job?", body: "Side-by-side offer comparison with break-even wage and schedule checks." },
  { n: 5, to: "/one-change", icon: CalendarClock, title: "One Change Away", body: "Find the single barrier whose removal unlocks a better opportunity." },
] as const;

function Home() {
  const journey = useJourney();
  return (
    <>
      <section className="relative overflow-hidden bg-hero text-navy-foreground">
        <div className="grid-fade pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
          <div className="animate-rise space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-navy-border bg-navy-foreground/5 px-3 py-1 text-xs font-medium text-navy-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
              Hack for Humanity Detroit 2026 · Job Displacement track
            </div>
            <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
              A better job doesn't always mean a better life.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-navy-muted">
              LifePath AI connects your skills, income, expenses, schedule, and goals to help you make smarter career and
              life decisions.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="hero">
                <Link to="/profile">
                  Explore My LifePath <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button size="lg" variant="hero-outline" onClick={journey.start}>
                <PlayCircle aria-hidden /> Try the Live Demo
              </Button>
            </div>
            <p className="flex items-center gap-2 text-xs text-navy-muted">
              <ShieldCheck className="h-4 w-4" aria-hidden /> No account. Your data stays in this browser.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <img
              src={heroImage}
              alt="A Detroit manufacturing worker looking out over the city from a factory floor"
              width={1200}
              height={1408}
              className="aspect-[4/5] w-full rounded-3xl object-cover shadow-elevated"
            />
            <div className="absolute -bottom-6 left-4 right-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-elevated sm:-left-8 sm:right-auto sm:w-80">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Sample: $20 → $25/hr offer
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Gross pay</div>
                  <div className="tabular text-xl font-bold text-success">{signedMoney(sample.deltas.grossMonthly)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">After new costs</div>
                  <div className="tabular text-xl font-bold text-warning-strong">
                    {signedMoney(sample.deltas.remainingMonthly)}
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-destructive-soft px-3 py-2 text-xs font-medium text-destructive">
                6 AM shift starts before childcare opens
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="surface p-6">
            <div className="text-sm font-medium text-muted-foreground">The raise looks like</div>
            <div className="tabular mt-1 text-3xl font-bold text-foreground">{money(sample.deltas.grossMonthly)}/mo</div>
            <p className="mt-2 text-sm text-muted-foreground">$5 more per hour × 40 hours × 52/12 weeks.</p>
          </div>
          <div className="surface p-6">
            <div className="text-sm font-medium text-muted-foreground">What's actually left</div>
            <div className="tabular mt-1 text-3xl font-bold text-warning-strong">
              {signedMoney(sample.deltas.remainingMonthly)}/mo
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              After 78% estimated take-home, +$450 childcare, and +$180 commuting.
            </p>
          </div>
          <div className="surface p-6">
            <div className="text-sm font-medium text-muted-foreground">Break-even wage</div>
            <div className="tabular mt-1 text-3xl font-bold text-primary">{wage(sample.breakEvenWage)}/hr</div>
            <p className="mt-2 text-sm text-muted-foreground">The pay at which this offer only matches today.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold text-foreground">Five connected steps</h2>
          <p className="mt-2 text-muted-foreground">
            Everything you enter flows through every step, so the advice reflects your real life — not just a pay rate.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STAGES.map((s) => (
            <Link
              key={s.n}
              to={s.to}
              className="group surface flex flex-col gap-3 p-5 transition-all hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-accent-foreground">
                  <s.icon className="h-5 w-5" aria-hidden />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">0{s.n}</span>
              </div>
              <div className="font-semibold text-foreground">{s.title}</div>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              <span className="mt-auto flex items-center gap-1 text-sm font-semibold text-primary">
                Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-hero p-8 text-navy-foreground sm:p-12">
          <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-success">
                <BriefcaseBusiness className="h-4 w-4" aria-hidden /> One Change Away
              </div>
              <p className="max-w-2xl text-2xl font-semibold leading-snug">
                Sometimes the next step isn't a new job. It's removing the barrier that makes a better opportunity possible.
              </p>
            </div>
            <Button size="lg" variant="hero" onClick={journey.start}>
              <PlayCircle aria-hidden /> Walk through the demo
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
