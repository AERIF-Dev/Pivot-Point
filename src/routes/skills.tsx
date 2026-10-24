import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, BadgeCheck, Compass, GraduationCap, Info, Layers, Lightbulb, ShieldAlert } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AiAction, AiResultMeta } from "@/components/lifepath/ai";
import { NextStage, PageBody, PageHeader, Panel } from "@/components/lifepath/blocks";
import { Badge } from "@/components/ui/badge";
import type { ExtractedSkill, SuggestedCareer } from "@/lib/ai/contract";
import { fixtures } from "@/lib/ai/fixtures";
import { profileForAi } from "@/lib/ai/inputs";
import { useLifePath } from "@/state/lifepath-store";
import { useAiOperation } from "@/state/use-ai";

export const Route = createFileRoute("/skills")({
  head: () => ({
    meta: [
      { title: "Skills Explorer — Transferable skills | PivotPoint" },
      {
        name: "description",
        content: "Gemma 4 reads the tasks you've actually done and maps them to related career paths, gaps, and next learning steps.",
      },
      { property: "og:title", content: "Skills Explorer — PivotPoint" },
      { property: "og:description", content: "Discover the transferable skills hiding in your work history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SkillsPage,
});

const PRIVACY = "Sends only your work details (titles, tasks, tools, interests, city) to Google's Gemini API. No finances or nickname.";

function SkillsPage() {
  const { data } = useLifePath();
  const skillsOp = useAiOperation("extract_skills");
  const careersOp = useAiOperation("suggest_careers");
  const hasWork = Boolean(data.profile.tasks.trim() || data.profile.ownWords.trim() || data.profile.currentTitle.trim());
  const skills = skillsOp.result?.data.skills ?? [];
  const careers = careersOp.result?.data.careers ?? [];

  return (
    <>
      <PageHeader
        id="skills-top"
        stage={2}
        eyebrow="Skills Explorer"
        title="Discover your transferable skills"
        description="Your job title doesn't capture everything you can do. Gemma 4 looks at the real tasks behind it."
      />
      <PageBody>
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary-soft p-4 text-sm text-accent-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            <strong className="font-semibold">AI-suggested directions are not job offers.</strong> PivotPoint does not list
            openings, salaries, or employers, and never decides whether you qualify for a role. Verify requirements with
            employers or local workforce services.
          </p>
        </div>

        <Panel
          title="Transferable skills"
          description="Grounded in evidence from your own profile."
          icon={<Lightbulb className="h-4 w-4" />}
          actions={skillsOp.result ? <AiResultMeta result={skillsOp.result} /> : null}
        >
          <AiAction
            label={skillsOp.result ? "Re-analyze my skills" : "Find my transferable skills"}
            onRun={() => skillsOp.run({ profile: profileForAi(data.profile) })}
            loading={skillsOp.loading}
            error={skillsOp.error}
            configured={skillsOp.configured}
            disabled={!hasWork}
            onFixture={data.isSample ? () => skillsOp.useFixture(fixtures.extract_skills) : undefined}
            privacyNote={hasWork ? PRIVACY : (
              <>
                Add your tasks on <Link to="/profile" className="font-medium text-primary underline-offset-4 hover:underline">My Profile</Link> first.
              </>
            )}
          />

          {skillsOp.result ? (
            <div className="mt-6 space-y-6">
              {skillsOp.result.data.summary ? (
                <p className="text-base leading-relaxed text-foreground">{skillsOp.result.data.summary}</p>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                {skills.map((s, i) => (
                  <SkillCard key={`${s.name}-${i}`} skill={s} />
                ))}
              </div>
              <SkillMap skills={skills} />
            </div>
          ) : null}
        </Panel>

        <Panel
          title="What else could I do?"
          description="Career directions your experience could lead toward — general job families, not openings."
          icon={<Compass className="h-4 w-4" />}
          actions={careersOp.result ? <AiResultMeta result={careersOp.result} /> : null}
        >
          <AiAction
            label="What else could I do?"
            variant="soft"
            onRun={() =>
              careersOp.run({
                profile: profileForAi(data.profile),
                knownSkills: skills.slice(0, 12).map((s) => s.name.slice(0, 80)),
              })
            }
            loading={careersOp.loading}
            error={careersOp.error}
            configured={careersOp.configured}
            disabled={!hasWork}
            onFixture={data.isSample ? () => careersOp.useFixture(fixtures.suggest_careers) : undefined}
            privacyNote={hasWork ? PRIVACY : undefined}
          />
          {careersOp.result ? (
            <div className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {careers.map((c, i) => (
                  <CareerCard key={`${c.title}-${i}`} career={c} />
                ))}
              </div>
              {careersOp.result.data.caveat ? (
                <p className="text-xs text-muted-foreground">{careersOp.result.data.caveat}</p>
              ) : null}
            </div>
          ) : null}
        </Panel>

        <NextStage to="/finances" label="Understand your real finances & time" description="Income, expenses, commute, and childcare in one view." />
      </PageBody>
    </>
  );
}

function SkillCard({ skill }: { skill: ExtractedSkill }) {
  return (
    <article className="animate-rise flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">{skill.name}</h3>
        <p className="mt-1 text-sm italic text-muted-foreground">“{skill.evidence}”</p>
      </div>
      {skill.relatedCareers.length ? (
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Related career paths</div>
          <div className="flex flex-wrap gap-1.5">
            {skill.relatedCareers.map((c) => (
              <Badge key={c} variant="info">{c}</Badge>
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {skill.existingStrengths.length ? (
          <div>
            <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-success">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> You already have
            </div>
            <ul className="space-y-0.5 text-sm text-foreground/80">
              {skill.existingStrengths.map((x) => <li key={x}>• {x}</li>)}
            </ul>
          </div>
        ) : null}
        {skill.possibleGaps.length ? (
          <div>
            <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-warning-strong">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> May be required (verify)
            </div>
            <ul className="space-y-0.5 text-sm text-foreground/80">
              {skill.possibleGaps.map((x) => <li key={x}>• {x}</li>)}
            </ul>
          </div>
        ) : null}
      </div>
      {skill.nextStep ? (
        <div className="mt-auto flex items-start gap-2 rounded-lg bg-muted p-3 text-sm">
          <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span><strong className="font-semibold">Next learning step:</strong> {skill.nextStep}</span>
        </div>
      ) : null}
    </article>
  );
}

function SkillMap({ skills }: { skills: ExtractedSkill[] }) {
  const careers = Array.from(new Set(skills.flatMap((s) => s.relatedCareers))).slice(0, 10);
  const chart = skills.map((s) => ({
    name: s.name,
    "Career paths": s.relatedCareers.length,
    "Strengths you have": s.existingStrengths.length,
    "Items to verify": s.possibleGaps.length,
  }));
  if (careers.length === 0) return null;
  return (
    <div className="grid gap-6 rounded-xl border border-border bg-background p-5 lg:grid-cols-2">
      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Layers className="h-4 w-4 text-primary" aria-hidden /> How your skills connect
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th className="text-left font-medium text-muted-foreground" scope="col">Skill</th>
                {careers.map((c) => (
                  <th key={c} scope="col" className="h-28 w-8 align-bottom font-medium text-muted-foreground">
                    <span className="inline-block max-h-28 truncate [writing-mode:vertical-rl] rotate-180" title={c}>{c}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {skills.map((s) => (
                <tr key={s.name}>
                  <th scope="row" className="max-w-40 truncate pr-2 text-left font-medium text-foreground" title={s.name}>{s.name}</th>
                  {careers.map((c) => {
                    const on = s.relatedCareers.includes(c);
                    return (
                      <td key={c} className="text-center">
                        <span
                          className={on ? "mx-auto block h-5 w-5 rounded-md bg-success" : "mx-auto block h-5 w-5 rounded-md bg-muted"}
                          aria-label={on ? `${s.name} supports ${c}` : undefined}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <div className="mb-3 text-sm font-semibold text-foreground">What each skill brings</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: "var(--foreground)" }} />
              <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Career paths" stackId="a" fill="var(--chart-1)" />
              <Bar dataKey="Strengths you have" stackId="a" fill="var(--chart-2)" />
              <Bar dataKey="Items to verify" stackId="a" fill="var(--chart-3)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function CareerCard({ career }: { career: SuggestedCareer }) {
  return (
    <article className="animate-rise flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="ai">AI-suggested direction</Badge>
        {career.family ? <Badge variant="secondary">{career.family}</Badge> : null}
      </div>
      <h3 className="text-base font-semibold text-foreground">{career.title}</h3>
      <p className="text-sm leading-relaxed text-foreground/80">{career.whyItFits}</p>
      {career.transferableSkills.length ? (
        <div className="flex flex-wrap gap-1.5">
          {career.transferableSkills.map((s) => (
            <Badge key={s} variant="success">{s}</Badge>
          ))}
        </div>
      ) : null}
      {career.regulated ? (
        <div className="flex items-start gap-2 rounded-lg bg-warning-soft p-2.5 text-xs text-warning-foreground">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-strong" aria-hidden />
          May be a licensed or regulated role. Experience alone may not qualify you — check official requirements.
        </div>
      ) : null}
      {career.possibleRequirements.length ? (
        <div>
          <div className="mb-1 text-xs font-semibold text-muted-foreground">Possible requirements to verify</div>
          <ul className="space-y-0.5 text-sm text-foreground/80">
            {career.possibleRequirements.map((r) => <li key={r}>• {r}</li>)}
          </ul>
        </div>
      ) : null}
      {career.firstStep ? (
        <p className="mt-auto border-t border-border pt-3 text-sm"><strong className="font-semibold">First step:</strong> {career.firstStep}</p>
      ) : null}
    </article>
  );
}
