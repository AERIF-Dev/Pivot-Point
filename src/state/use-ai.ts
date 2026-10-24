import { useQuery } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

import { AiRequestError, analyze, fetchAiStatus } from "@/lib/ai/client";
import type { AiOperationName, InputOf, OutputOf } from "@/lib/ai/contract";
import type { StoredAiResult } from "@/lib/lifepath/types";
import { useLifePath } from "./lifepath-store";

export function useAiStatus() {
  return useQuery({
    queryKey: ["ai-status"],
    queryFn: fetchAiStatus,
    staleTime: 60_000,
    retry: false,
  });
}

export interface AiRunState {
  loading: boolean;
  error: AiRequestError | null;
}

/** User-initiated AI operation. Results are stored with their true source. */
export function useAiOperation<Op extends AiOperationName>(op: Op) {
  const { data, setAiResult } = useLifePath();
  const [state, setState] = useState<AiRunState>({ loading: false, error: null });
  const controller = useRef<AbortController | null>(null);
  const status = useAiStatus();

  const run = useCallback(
    async (input: InputOf<Op>) => {
      controller.current?.abort();
      const c = new AbortController();
      controller.current = c;
      setState({ loading: true, error: null });
      try {
        const res = await analyze(op, input, c.signal);
        setAiResult(op, {
          source: "gemma",
          model: res.model,
          createdAt: new Date().toISOString(),
          data: res.data,
        });
        setState({ loading: false, error: null });
        if (!status.data?.configured) void status.refetch();
      } catch (err) {
        if (c.signal.aborted) return;
        const e =
          err instanceof AiRequestError
            ? err
            : new AiRequestError("network", "Something went wrong. Please try again.");
        setState({ loading: false, error: e });
        if (e.code === "not_configured") void status.refetch();
      }
    },
    [op, setAiResult, status],
  );

  const useFixture = useCallback(
    (fixture: OutputOf<Op>) => {
      setAiResult(op, {
        source: "fixture",
        model: "none",
        createdAt: new Date().toISOString(),
        data: fixture,
      });
      setState({ loading: false, error: null });
    },
    [op, setAiResult],
  );

  const stored = data.ai[op] as (StoredAiResult & { data: OutputOf<Op> }) | undefined;

  return {
    ...state,
    run,
    useFixture,
    result: stored,
    configured: status.data?.configured,
    statusLoading: status.isLoading,
  };
}
