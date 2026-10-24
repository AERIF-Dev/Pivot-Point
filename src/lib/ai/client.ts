// Browser API client. The only place the frontend talks to the AI proxy.
// Swap API_BASE to point at a Cloudflare Worker without touching components.
import type {
  AiErrorCode,
  AiOperationName,
  AiStatus,
  AnalyzeFailure,
  AnalyzeSuccess,
  InputOf,
} from "./contract";

const API_BASE = "/api/analyze";

export class AiRequestError extends Error {
  constructor(
    public code: AiErrorCode | "network",
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "AiRequestError";
  }
}

export async function fetchAiStatus(): Promise<AiStatus> {
  const res = await fetch(API_BASE, { method: "GET", headers: { accept: "application/json" } });
  if (!res.ok) throw new AiRequestError("network", "Could not check AI status", res.status);
  return (await res.json()) as AiStatus;
}

export async function analyze<Op extends AiOperationName>(
  operation: Op,
  input: InputOf<Op>,
  signal?: AbortSignal,
): Promise<AnalyzeSuccess<Op>> {
  let res: Response;
  try {
    res = await fetch(API_BASE, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ operation, input }),
      signal: signal ?? null,
    });
  } catch {
    throw new AiRequestError("network", "Could not reach PivotPoint's AI service. Check your connection.");
  }
  let body: AnalyzeSuccess<Op> | AnalyzeFailure;
  try {
    body = (await res.json()) as AnalyzeSuccess<Op> | AnalyzeFailure;
  } catch {
    throw new AiRequestError("upstream_error", "Unexpected response from the AI service.", res.status);
  }
  if (!body.ok) throw new AiRequestError(body.error.code, body.error.message, res.status);
  return body;
}
