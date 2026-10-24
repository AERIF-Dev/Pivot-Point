// Shared AI contract: request validation + response validation.
// Used by the server endpoint (src/server/analyze.ts), the optional Cloudflare
// Worker adapter (worker/), and the browser API client. Framework-neutral.
import { z } from "zod";

export const GEMMA_MODEL = "gemma-4-26b-a4b-it";
export const GEMMA_DISPLAY_NAME = "Gemma 4";

export const AI_OPERATIONS = [
  "extract_skills",
  "suggest_careers",
  "explain_scenario",
  "identify_barriers",
  "generate_action_plan",
] as const;
export type AiOperationName = (typeof AI_OPERATIONS)[number];

// ---------- Input schemas (strict, bounded) ----------

const s = (max: number) => z.string().max(max).default("");

export const ProfileInputSchema = z.object({
  currentTitle: s(200),
  previousJobs: s(600),
  yearsExperience: z.number().min(0).max(70).default(0),
  tasks: s(2000),
  tools: s(800),
  skillsAndCerts: s(600),
  preferredWorkTypes: s(300),
  interests: s(400),
  location: s(80),
  ownWords: s(1500),
});
export type ProfileInput = z.infer<typeof ProfileInputSchema>;

const FiguresSchema = z
  .record(z.string().max(48), z.number().finite())
  .refine((r) => Object.keys(r).length <= 24, "Too many figures");

export const InputSchemas = {
  extract_skills: z.object({ profile: ProfileInputSchema }),
  suggest_careers: z.object({
    profile: ProfileInputSchema,
    knownSkills: z.array(z.string().max(80)).max(12).default([]),
  }),
  explain_scenario: z.object({
    currentTitle: s(120),
    offerTitle: s(120),
    figures: FiguresSchema,
    conflicts: z.array(z.string().max(400)).max(8).default([]),
    verdict: s(80),
    calculatorSummary: s(700),
  }),
  identify_barriers: z.object({
    figures: FiguresSchema,
    conflicts: z.array(z.string().max(400)).max(8).default([]),
    priorities: z.array(z.string().max(120)).max(6).default([]),
    calculatedChanges: z.array(z.string().max(240)).max(10).default([]),
    careerInterests: s(400),
    currentTitle: s(120),
    offerTitle: s(120),
  }),
  generate_action_plan: z.object({
    goal: s(300),
    chosenChanges: z.array(z.string().max(240)).max(6).default([]),
    skills: z.array(z.string().max(80)).max(10).default([]),
    interests: s(400),
    location: s(80),
  }),
} satisfies Record<AiOperationName, z.ZodTypeAny>;

export type InputOf<Op extends AiOperationName> = z.input<(typeof InputSchemas)[Op]>;

export const AnalyzeRequestSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("extract_skills"), input: InputSchemas.extract_skills }),
  z.object({ operation: z.literal("suggest_careers"), input: InputSchemas.suggest_careers }),
  z.object({ operation: z.literal("explain_scenario"), input: InputSchemas.explain_scenario }),
  z.object({ operation: z.literal("identify_barriers"), input: InputSchemas.identify_barriers }),
  z.object({
    operation: z.literal("generate_action_plan"),
    input: InputSchemas.generate_action_plan,
  }),
]);
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

// ---------- Output schemas (lenient coercion, bounded lengths) ----------

const text = (max: number) =>
  z
    .preprocess(
      (v) => (v == null ? "" : typeof v === "string" ? v : String(v)),
      z.string(),
    )
    .transform((v) => v.trim().slice(0, max));

const list = (maxItems: number, itemMax: number) =>
  z
    .preprocess(
      (v) => (Array.isArray(v) ? v : typeof v === "string" && v ? [v] : []),
      z.array(text(itemMax)),
    )
    .transform((a) => a.filter(Boolean).slice(0, maxItems));

const bool = z.preprocess((v) => v === true || v === "true", z.boolean());

const objects = <T extends z.ZodTypeAny>(item: T, maxItems: number, minItems = 1) =>
  z
    .preprocess((v) => (Array.isArray(v) ? v : []), z.array(item))
    .transform((a) => a.slice(0, maxItems))
    .refine((a) => a.length >= minItems, `Expected at least ${minItems} item(s)`);

export const SkillSchema = z.object({
  name: text(80),
  evidence: text(300),
  relatedCareers: list(5, 80),
  existingStrengths: list(5, 100),
  possibleGaps: list(4, 140),
  nextStep: text(240),
});

export const CareerSchema = z.object({
  title: text(90),
  family: text(60),
  whyItFits: text(360),
  transferableSkills: list(6, 80),
  possibleRequirements: list(5, 160),
  regulated: bool,
  firstStep: text(240),
});

export const OutputSchemas = {
  extract_skills: z.object({
    summary: text(400),
    skills: objects(SkillSchema, 8),
  }),
  suggest_careers: z.object({
    careers: objects(CareerSchema, 6),
    caveat: text(300),
  }),
  explain_scenario: z.object({
    headline: text(140),
    explanation: text(900),
    considerations: list(5, 240),
    questionsToAsk: list(5, 200),
  }),
  identify_barriers: z.object({
    barriers: objects(
      z.object({
        barrier: text(140),
        whyItMatters: text(300),
        possibleChange: text(240),
        unlocks: text(240),
        nextAction: text(240),
        verifyFirst: text(240),
      }),
      4,
    ),
    insight: text(300),
  }),
  generate_action_plan: z.object({
    steps: objects(
      z.object({ timeframe: text(40), action: text(240), why: text(240) }),
      6,
    ),
    encouragement: text(240),
  }),
} satisfies Record<AiOperationName, z.ZodTypeAny>;

export type OutputOf<Op extends AiOperationName> = z.output<(typeof OutputSchemas)[Op]>;
export type ExtractedSkill = z.output<typeof SkillSchema>;
export type SuggestedCareer = z.output<typeof CareerSchema>;

// ---------- Envelope ----------

export type AiErrorCode =
  | "not_configured"
  | "invalid_request"
  | "payload_too_large"
  | "rate_limited"
  | "timeout"
  | "upstream_auth"
  | "model_unavailable"
  | "content_refused"
  | "bad_ai_output"
  | "upstream_error"
  | "forbidden";

export interface AnalyzeSuccess<Op extends AiOperationName = AiOperationName> {
  ok: true;
  operation: Op;
  source: "gemma";
  model: string;
  data: OutputOf<Op>;
}

export interface AnalyzeFailure {
  ok: false;
  error: { code: AiErrorCode; message: string };
}

export interface AiStatus {
  configured: boolean;
  model: string;
  provider: string;
}
