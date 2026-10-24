import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { createEmptyData, createSampleData } from "@/lib/lifepath/sample";
import type { AiOperation, LifePathData, StoredAiResult } from "@/lib/lifepath/types";

/** Browser-only storage key. Holds non-sensitive demo data only. */
export const STORAGE_KEY = "lifepath-ai:v1";

type Section = "profile" | "finances" | "schedule" | "currentJob" | "offer";

interface LifePathStore {
  data: LifePathData;
  hydrated: boolean;
  update: (fn: (d: LifePathData) => LifePathData) => void;
  patch: <K extends Section>(section: K, patch: Partial<LifePathData[K]>) => void;
  setField: <K extends keyof LifePathData>(key: K, value: LifePathData[K]) => void;
  setAiResult: (op: AiOperation, result: StoredAiResult) => void;
  loadSample: () => void;
  startFresh: () => void;
  clearAll: () => void;
}

const Ctx = createContext<LifePathStore | null>(null);

function mergeStored(raw: unknown): LifePathData | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<LifePathData>;
  if (s.version !== 1) return null;
  const base = s.isSample ? createSampleData() : createEmptyData();
  return {
    ...base,
    isSample: Boolean(s.isSample),
    profile: { ...base.profile, ...(s.profile ?? {}) },
    finances: { ...base.finances, ...(s.finances ?? {}) },
    schedule: { ...base.schedule, ...(s.schedule ?? {}) },
    currentJob: { ...base.currentJob, ...(s.currentJob ?? {}) },
    offer: { ...base.offer, ...(s.offer ?? {}) },
    targetImprovementMonthly:
      typeof s.targetImprovementMonthly === "number"
        ? s.targetImprovementMonthly
        : base.targetImprovementMonthly,
    appliedChanges:
      s.appliedChanges && typeof s.appliedChanges === "object" ? s.appliedChanges : {},
    ai: s.ai && typeof s.ai === "object" ? s.ai : {},
  };
}

export function LifePathProvider({ children }: { children: ReactNode }) {
  // Server and first client render use the fictional sample so the app works immediately.
  const [data, setData] = useState<LifePathData>(createSampleData);
  const [hydrated, setHydrated] = useState(false);
  const skipPersist = useRef(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const merged = stored ? mergeStored(JSON.parse(stored)) : null;
      if (merged) setData(merged);
    } catch {
      /* corrupted storage — keep sample */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage full or disabled */
    }
  }, [data, hydrated]);

  const update = useCallback((fn: (d: LifePathData) => LifePathData) => setData((d) => fn(d)), []);

  const patch = useCallback(
    <K extends Section>(section: K, p: Partial<LifePathData[K]>) =>
      setData((d) => ({ ...d, [section]: { ...d[section], ...p } })),
    [],
  );

  const setField = useCallback(
    <K extends keyof LifePathData>(key: K, value: LifePathData[K]) =>
      setData((d) => ({ ...d, [key]: value })),
    [],
  );

  const setAiResult = useCallback(
    (op: AiOperation, result: StoredAiResult) =>
      setData((d) => ({ ...d, ai: { ...d.ai, [op]: result } })),
    [],
  );

  const loadSample = useCallback(() => setData(createSampleData()), []);
  const startFresh = useCallback(() => setData(createEmptyData()), []);
  const clearAll = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    skipPersist.current = true;
    setData(createEmptyData());
  }, []);

  const value = useMemo<LifePathStore>(
    () => ({ data, hydrated, update, patch, setField, setAiResult, loadSample, startFresh, clearAll }),
    [data, hydrated, update, patch, setField, setAiResult, loadSample, startFresh, clearAll],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLifePath(): LifePathStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLifePath must be used inside LifePathProvider");
  return ctx;
}
