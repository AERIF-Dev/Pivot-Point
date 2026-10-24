// Labeled demo fixtures for the fictional sample profile.
// These are NEVER presented as Gemma output: the UI marks them
// "Labeled example — not a live Gemma 4 response".
import type { OutputOf } from "./contract";

export const FIXTURE_LABEL = "Labeled example — not a live Gemma 4 response";

export const fixtures: {
  extract_skills: OutputOf<"extract_skills">;
  suggest_careers: OutputOf<"suggest_careers">;
  identify_barriers: OutputOf<"identify_barriers">;
} = {
  extract_skills: {
    summary:
      "Eight years on the line built hands-on quality, troubleshooting, and coordination skills that show up in many manufacturing and logistics roles.",
    skills: [
      {
        name: "Quality inspection & defect documentation",
        evidence: "Performs in-process inspections against spec sheets and documents defects for supervisors.",
        relatedCareers: ["Quality control inspector", "Manufacturing quality assurance", "Production auditing"],
        existingStrengths: ["Measuring with calipers and micrometers", "Reading spec sheets", "Written defect reports"],
        possibleGaps: ["Formal quality training (verify whether employers ask for it)", "Statistical process control basics"],
        nextStep: "Take an introductory course on quality fundamentals or SPC.",
      },
      {
        name: "Machine troubleshooting",
        evidence: "Troubleshoots and resets CNC and stamping machines when they fault.",
        relatedCareers: ["Maintenance technician", "CNC setup operator", "Automation support"],
        existingStrengths: ["CNC controls", "Lockout/tagout", "Diagnosing faults under pressure"],
        possibleGaps: ["Electrical or mechanical maintenance training", "PLC basics"],
        nextStep: "Look into an industrial maintenance or PLC fundamentals class.",
      },
      {
        name: "Inventory coordination",
        evidence: "Coordinates inventory counts and reorders parts for the line.",
        relatedCareers: ["Inventory control specialist", "Materials coordinator", "Supply chain associate"],
        existingStrengths: ["Barcode scanners", "Excel", "Plant inventory system"],
        possibleGaps: ["ERP system experience beyond your plant's tool"],
        nextStep: "Practice intermediate Excel (lookups, pivot tables).",
      },
      {
        name: "Training & safety leadership",
        evidence: "Trains new employees on safety procedures and station setup.",
        relatedCareers: ["Team lead", "Production trainer", "Safety coordinator"],
        existingStrengths: ["OSHA 10", "Explaining procedures clearly"],
        possibleGaps: ["Supervisory experience", "OSHA 30 for safety-focused roles (verify requirements)"],
        nextStep: "Ask your supervisor about leading a shift huddle or training program.",
      },
    ],
  },
  suggest_careers: {
    careers: [
      {
        title: "Quality Technician",
        family: "Manufacturing quality",
        whyItFits: "Your inspection and defect documentation work maps directly onto quality checks and reporting.",
        transferableSkills: ["Inspection", "Measurement tools", "Defect documentation"],
        possibleRequirements: ["Some employers prefer quality coursework or a certification — verify per posting"],
        regulated: false,
        firstStep: "Write down three defects you caught and what happened next — use them in interviews.",
      },
      {
        title: "Industrial Maintenance Technician",
        family: "Maintenance & reliability",
        whyItFits: "You already troubleshoot CNC and stamping machines and follow lockout/tagout.",
        transferableSkills: ["Troubleshooting", "Lockout/tagout", "CNC controls"],
        possibleRequirements: ["Mechanical/electrical training", "Electrical work may require licensing — verify"],
        regulated: true,
        firstStep: "Ask Michigan Works! about maintenance training options in your area.",
      },
      {
        title: "Inventory / Materials Coordinator",
        family: "Supply chain & logistics",
        whyItFits: "You coordinate counts and reorders and use scanning and inventory systems.",
        transferableSkills: ["Inventory systems", "Excel", "Coordination"],
        possibleRequirements: ["ERP familiarity is often listed — verify per posting"],
        regulated: false,
        firstStep: "Build an Excel skills refresher into your week.",
      },
    ],
    caveat:
      "These are AI-style career directions for the fictional sample, not job openings. Verify requirements with employers or Detroit at Work.",
  },
  identify_barriers: {
    barriers: [
      {
        barrier: "6 AM start before childcare opens",
        whyItMatters: "Even with a raise, the schedule doesn't work without a drop-off solution.",
        possibleChange: "Ask for a later shift or find early-opening care.",
        unlocks: "Makes the Quality Technician offer workable day to day.",
        nextAction: "Ask the employer which shifts are available for new technicians.",
        verifyFirst: "Whether a later shift exists for this role.",
      },
      {
        barrier: "New childcare and commuting costs",
        whyItMatters: "They absorb most of the higher take-home pay.",
        possibleChange: "Negotiate pay or find a closer, similar role.",
        unlocks: "A larger real improvement in monthly remaining funds.",
        nextAction: "Prepare a short case for a higher rate using your inspection experience.",
        verifyFirst: "Whether the posted rate is negotiable.",
      },
    ],
    insight: "The barrier is the schedule, not your skills.",
  },
};
