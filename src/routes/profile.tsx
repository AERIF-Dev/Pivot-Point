import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, ClipboardList, Eraser, MapPin, MessageSquareText, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";

import { NextStage, PageBody, PageHeader, Panel } from "@/components/lifepath/blocks";
import { DayPicker, NumberField, TextAreaField, TextField, TimeField } from "@/components/lifepath/fields";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { money } from "@/lib/lifepath/format";
import { monthlyGrossPay } from "@/lib/lifepath/finance";
import { useLifePath } from "@/state/lifepath-store";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My LifePath — Tell us about your work | LifePath AI" },
      {
        name: "description",
        content: "Describe your jobs, real tasks, tools, pay, and schedule. Nothing is required and everything stays on your device.",
      },
      { property: "og:title", content: "My LifePath — LifePath AI" },
      { property: "og:description", content: "Build your work profile in a guided form or in your own words." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

const PROMPTS = [
  "What does a normal day at work look like?",
  "What problems do people come to you to solve?",
  "What machines, tools, or software do you use?",
  "What would you like more of — or less of — in your next job?",
];

function ProfilePage() {
  const { data, patch, loadSample, startFresh } = useLifePath();
  const p = data.profile;
  const j = data.currentJob;
  const setP = (k: keyof typeof p) => (v: string | number) => patch("profile", { [k]: v } as Partial<typeof p>);

  const filled = [
    p.currentTitle,
    p.previousJobs,
    p.yearsExperience > 0 ? "y" : "",
    p.tasks,
    p.tools,
    p.skillsAndCerts,
    p.preferredWorkTypes,
    p.interests,
    p.location,
    j.hourlyWage > 0 ? "y" : "",
    j.hoursPerWeek > 0 ? "y" : "",
    j.shiftStart,
  ].filter((x) => String(x).trim()).length;
  const completeness = Math.round((filled / 12) * 100);

  return (
    <>
      <PageHeader
        id="profile-top"
        stage={1}
        eyebrow="My LifePath"
        title="Tell LifePath about yourself"
        description="Share what you actually do at work — not just your job title. Nothing is required; fill in what you can and come back anytime."
        actions={
          <>
            <Button
              onClick={() => {
                loadSample();
                toast.success("Sample profile loaded (fictional resident).");
              }}
            >
              <Sparkles aria-hidden /> Try Sample Profile
            </Button>
            <Button variant="outline" onClick={startFresh}>
              <Eraser aria-hidden /> Start fresh
            </Button>
          </>
        }
      />
      <PageBody>
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <Tabs defaultValue="form" className="space-y-6">
            <TabsList className="h-11">
              <TabsTrigger value="form" className="px-4">
                <ClipboardList className="mr-1.5 h-4 w-4" aria-hidden /> Guided form
              </TabsTrigger>
              <TabsTrigger value="words" className="px-4">
                <MessageSquareText className="mr-1.5 h-4 w-4" aria-hidden /> In my own words
              </TabsTrigger>
            </TabsList>

            <TabsContent value="form" className="space-y-6">
              <Panel title="Work history" icon={<Briefcase className="h-4 w-4" />}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="Current or most recent job title" value={p.currentTitle} onChange={setP("currentTitle")} placeholder="e.g. Production Associate" className="sm:col-span-2" />
                  <TextField label="Previous jobs" value={p.previousJobs} onChange={setP("previousJobs")} placeholder="e.g. Machine Operator (3 yrs)" />
                  <NumberField label="Years of experience" value={p.yearsExperience} onChange={setP("yearsExperience")} suffix="years" max={70} />
                </div>
              </Panel>

              <Panel
                title="What you actually do"
                description="Real tasks are what reveal transferable skills. One per line works best."
                icon={<ClipboardList className="h-4 w-4" />}
              >
                <div className="grid gap-4">
                  <TextAreaField label="Tasks you perform" value={p.tasks} onChange={setP("tasks")} rows={6} placeholder={"Inspect parts against spec sheets\nTroubleshoot machines when they fault"} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextAreaField label="Equipment, software, or tools" value={p.tools} onChange={setP("tools")} rows={3} />
                    <TextAreaField label="Skills & certifications" value={p.skillsAndCerts} onChange={setP("skillsAndCerts")} rows={3} hint="Only list credentials you actually hold." />
                  </div>
                </div>
              </Panel>

              <Panel title="Current pay & schedule" description="Used by the finance dashboard and Job Decision Lab." icon={<Wallet className="h-4 w-4" />}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <NumberField label="Hourly pay" value={j.hourlyWage} onChange={(v) => patch("currentJob", { hourlyWage: v })} prefix="$" suffix="/hr" step={0.25} />
                  <NumberField label="Paid hours per week" value={j.hoursPerWeek} onChange={(v) => patch("currentJob", { hoursPerWeek: v })} suffix="hrs" max={100} />
                  <TimeField label="Shift starts" value={j.shiftStart} onChange={(v) => patch("currentJob", { shiftStart: v })} />
                  <TimeField label="Shift ends" value={j.shiftEnd} onChange={(v) => patch("currentJob", { shiftEnd: v })} />
                  <DayPicker label="Working days" value={j.workDays} onChange={(v) => patch("currentJob", { workDays: v })} className="sm:col-span-2 lg:col-span-4" />
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  ≈ <span className="tabular font-semibold text-foreground">{money(monthlyGrossPay(j.hourlyWage, j.hoursPerWeek))}</span> per month before taxes
                  (hourly × hours × 52/12). Paid annually? Divide your salary by 2,080 for a 40-hour week.
                </p>
              </Panel>

              <Panel title="Goals & location" icon={<MapPin className="h-4 w-4" />}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="Preferred types of work" value={p.preferredWorkTypes} onChange={setP("preferredWorkTypes")} placeholder="e.g. hands-on, daytime, steady" />
                  <TextField label="Career interests" value={p.interests} onChange={setP("interests")} placeholder="e.g. quality control, leading a team" />
                  <TextField label="City or region" value={p.location} onChange={setP("location")} hint="City only — please don't enter a street address." />
                  <TextField label="Nickname (optional, never sent to AI)" value={p.nickname} onChange={setP("nickname")} />
                </div>
              </Panel>
            </TabsContent>

            <TabsContent value="words" className="space-y-6">
              <Panel
                title="Describe your work in your own words"
                description="Talk the way you would to a friend. LifePath's AI reads this together with the form when you ask for skills analysis."
                icon={<MessageSquareText className="h-4 w-4" />}
              >
                <div className="mb-4 flex flex-wrap gap-2">
                  {PROMPTS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setP("ownWords")(`${p.ownWords}${p.ownWords ? "\n\n" : ""}${q} `)}
                      className="rounded-full border border-input bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <TextAreaField label="Your story" value={p.ownWords} onChange={setP("ownWords")} rows={10} placeholder="I've worked in manufacturing for…" />
              </Panel>
            </TabsContent>
          </Tabs>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="surface p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground">Profile detail</span>
                <span className="tabular text-muted-foreground">{completeness}%</span>
              </div>
              <Progress value={completeness} className="mt-3 h-2" />
              <p className="mt-3 text-xs text-muted-foreground">
                More real tasks and tools = better skill matches. You can move on at any time.
              </p>
            </div>
            <div className="surface space-y-2 p-5 text-xs leading-relaxed text-muted-foreground">
              <div className="text-sm font-semibold text-foreground">Your privacy</div>
              <p>Saved only in this browser. No account, no address, no bank or Social Security numbers.</p>
              <p>AI analysis runs only when you press an AI button, and sends only your work details — never your nickname or finances.</p>
            </div>
            <NextStage to="/skills" label="Discover transferable skills" description="See where your experience can take you." />
          </aside>
        </div>
      </PageBody>
    </>
  );
}
