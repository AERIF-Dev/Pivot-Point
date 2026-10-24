import { useNavigate } from "@tanstack/react-router";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { useLifePath } from "./lifepath-store";

export type JourneyPath = "/profile" | "/skills" | "/job-lab" | "/one-change";

export interface JourneyStep {
  path: JourneyPath;
  anchor?: string;
  title: string;
  body: string;
}

export const JOURNEY_STEPS: JourneyStep[] = [
  {
    path: "/profile",
    anchor: "profile-top",
    title: "Meet a Detroit worker",
    body: "A fictional sample resident: 8 years in manufacturing, $20/hr, 8 AM–4 PM, a young child in daycare. Every field is editable.",
  },
  {
    path: "/skills",
    anchor: "skills-top",
    title: "Skills that transfer",
    body: "Inspections, troubleshooting, inventory, training. Press “Find my transferable skills” to run a live Gemma 4 analysis of the real tasks.",
  },
  {
    path: "/job-lab",
    anchor: "comparison",
    title: "The apparent raise",
    body: "A Quality Technician offer pays $25/hr, a $5 raise. That's about $867 more a month before taxes. Looks like an easy yes.",
  },
  {
    path: "/job-lab",
    anchor: "conflicts",
    title: "Hidden costs & a schedule conflict",
    body: "New childcare (+$450) and a longer commute (+$180) eat most of the raise. And the 6 AM start falls before childcare opens at 7 AM.",
  },
  {
    path: "/job-lab",
    anchor: "break-even",
    title: "The break-even wage",
    body: "At about $24.66/hr the new job only matches today. Drag the wage slider: every number updates instantly with no AI involved.",
  },
  {
    path: "/one-change",
    anchor: "changes",
    title: "One Change Away",
    body: "A higher wage helps the money but not the schedule. An 8 AM start fixes the conflict. Press “Try this change” to see it.",
  },
];

interface JourneyState {
  step: number | null;
  current: JourneyStep | null;
  start: () => void;
  go: (index: number) => void;
  next: () => void;
  back: () => void;
  exit: () => void;
}

const Ctx = createContext<JourneyState | null>(null);

function scrollToAnchor(anchor?: string) {
  if (!anchor) return;
  let tries = 0;
  const tick = () => {
    const el = document.getElementById(anchor);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (tries++ < 20) {
      window.setTimeout(tick, 60);
    }
  };
  window.setTimeout(tick, 60);
}

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<number | null>(null);
  const navigate = useNavigate();
  const { loadSample, data } = useLifePath();

  const go = useCallback(
    (index: number) => {
      const s = JOURNEY_STEPS[index];
      if (!s) return;
      setStep(index);
      void navigate({ to: s.path }).then(() => scrollToAnchor(s.anchor));
    },
    [navigate],
  );

  const start = useCallback(() => {
    if (!data.isSample || Object.keys(data.appliedChanges).length > 0) {
      const ok =
        data.isSample ||
        window.confirm("The demo loads the fictional sample profile and replaces your current entries on this device. Continue?");
      if (!ok) return;
    }
    loadSample();
    go(0);
  }, [data.isSample, data.appliedChanges, loadSample, go]);

  const value = useMemo<JourneyState>(
    () => ({
      step,
      current: step == null ? null : JOURNEY_STEPS[step],
      start,
      go,
      next: () => (step == null ? undefined : step < JOURNEY_STEPS.length - 1 ? go(step + 1) : setStep(null)),
      back: () => (step != null && step > 0 ? go(step - 1) : undefined),
      exit: () => setStep(null),
    }),
    [step, start, go],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useJourney(): JourneyState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useJourney must be used inside JourneyProvider");
  return ctx;
}
