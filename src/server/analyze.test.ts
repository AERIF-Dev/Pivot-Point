import { afterEach, describe, expect, it, vi } from "vitest";

import { extractJsonObject, handleAnalyze } from "./analyze";

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

const profile = {
  currentTitle: "Production Associate",
  previousJobs: "",
  yearsExperience: 8,
  tasks: "Inspect parts",
  tools: "",
  skillsAndCerts: "",
  preferredWorkTypes: "",
  interests: "",
  location: "Detroit, MI",
  ownWords: "",
};

afterEach(() => vi.unstubAllGlobals());

describe("AI proxy", () => {
  it("reports the Gemma 4 model and whether a key is configured", async () => {
    const res = await handleAnalyze(new Request("http://localhost/api/analyze"), {});
    expect(await res.json()).toEqual({ configured: false, model: "gemma-4-26b-a4b-it", provider: "Google Gemini API" });
  });

  it("returns 'AI connection required' (503) without GEMINI_API_KEY", async () => {
    const res = await handleAnalyze(post({ operation: "extract_skills", input: { profile } }), {});
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("not_configured");
  });

  it("rejects cross-site requests", async () => {
    const res = await handleAnalyze(post({ operation: "extract_skills", input: { profile } }, { "sec-fetch-site": "cross-site" }), {
      GEMINI_API_KEY: "k",
    });
    expect(res.status).toBe(403);
  });

  it("rejects unknown operations", async () => {
    const res = await handleAnalyze(post({ operation: "do_anything", input: {} }), { GEMINI_API_KEY: "k" });
    expect(res.status).toBe(400);
  });

  it("calls gemma-4-26b-a4b-it, ignores thought parts, and validates the JSON", async () => {
    const chunks = [
      { candidates: [{ content: { parts: [{ text: "thinking…", thought: true }] } }] },
      { candidates: [{ content: { parts: [{ text: '```json\n{"summary":"ok","skills":[{"name":"Inspection",' }] } }] },
      {
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: '"evidence":"Inspect parts","relatedCareers":["QA"],"existingStrengths":[],"possibleGaps":[],"nextStep":"Take a course"}]}\n```' }] },
          },
        ],
      },
    ];
    const sse = chunks.map((c) => `data: ${JSON.stringify(c)}\r\n\r\n`).join("");
    const fetchMock = vi.fn(async () => new Response(sse, { headers: { "content-type": "text/event-stream" } }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await handleAnalyze(post({ operation: "extract_skills", input: { profile } }), { GEMINI_API_KEY: "k" });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.source).toBe("gemma");
    expect(body.data.skills[0].name).toBe("Inspection");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/models/gemma-4-26b-a4b-it:streamGenerateContent");
    expect(new Headers(init.headers).get("x-goog-api-key")).toBe("k");
  });

  it("extracts a JSON object surrounded by stray text", () => {
    expect(extractJsonObject('Sure! {"a":1} done')).toEqual({ a: 1 });
  });
});
