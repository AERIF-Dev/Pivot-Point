import { AlertTriangle, Bot, FlaskConical, Loader2, PlugZap, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GEMMA_DISPLAY_NAME, GEMMA_MODEL } from "@/lib/ai/contract";
import type { AiRequestError } from "@/lib/ai/client";
import { FIXTURE_LABEL } from "@/lib/ai/fixtures";
import type { StoredAiResult } from "@/lib/lifepath/types";
import { useAiStatus } from "@/state/use-ai";
import { cn } from "@/lib/utils";

export function AiStatusBadge({ className }: { className?: string }) {
  const { data, isLoading, isError } = useAiStatus();
  const configured = data?.configured;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        configured
          ? "border-success/30 bg-success-soft text-success"
          : "border-warning/40 bg-warning-soft text-warning-strong",
        className,
      )}
      title={configured ? `Model: ${GEMMA_MODEL}` : "Add GEMINI_API_KEY to enable live AI"}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", configured ? "bg-success" : "bg-warning")}
        aria-hidden
      />
      {isLoading ? "Checking AI…" : configured ? `AI analysis: ${GEMMA_DISPLAY_NAME}` : isError ? "AI status unknown" : "AI connection required"}
    </span>
  );
}

export function AiResultMeta({ result }: { result: StoredAiResult }) {
  if (result.source === "fixture") {
    return (
      <Badge variant="fixture">
        <FlaskConical aria-hidden /> {FIXTURE_LABEL}
      </Badge>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="ai">
        <Sparkles aria-hidden /> AI analysis: {GEMMA_DISPLAY_NAME}
      </Badge>
      <span className="text-xs text-muted-foreground">
        {result.model} · {new Date(result.createdAt).toLocaleString()}
      </span>
    </div>
  );
}

/**
 * Wraps a user-initiated AI action: button, not-configured state, errors,
 * and an optional clearly-labeled fixture.
 */
export function AiAction({
  label,
  runningLabel = "Gemma 4 is analyzing…",
  onRun,
  loading,
  error,
  configured,
  onFixture,
  disabled,
  privacyNote,
  variant = "default",
}: {
  label: string;
  runningLabel?: string | undefined;
  onRun: () => void;
  loading: boolean;
  error: AiRequestError | null;
  configured: boolean | undefined;
  onFixture?: (() => void) | undefined;
  disabled?: boolean | undefined;
  privacyNote?: ReactNode;
  variant?: "default" | "soft" | "outline" | undefined;
}) {
  const notConfigured = configured === false || error?.code === "not_configured";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onRun} disabled={loading || disabled || notConfigured} variant={variant}>
          {loading ? <Loader2 className="animate-spin" aria-hidden /> : <Bot aria-hidden />}
          {loading ? runningLabel : label}
        </Button>
        {onFixture && (notConfigured || error) ? (
          <Button variant="outline" onClick={onFixture}>
            <FlaskConical aria-hidden /> Show labeled example
          </Button>
        ) : null}
      </div>
      {privacyNote ? <p className="text-xs text-muted-foreground">{privacyNote}</p> : null}
      {notConfigured ? (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm text-warning-foreground">
          <PlugZap className="mt-0.5 h-4 w-4 shrink-0 text-warning-strong" aria-hidden />
          <div>
            <div className="font-semibold">AI connection required</div>
            <div className="text-xs">
              Live Gemma 4 analysis turns on once a Gemini API key is added. Calculators and forms keep working without it.
            </div>
          </div>
        </div>
      ) : error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive-soft p-3 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error.message}</span>
        </div>
      ) : null}
    </div>
  );
}
