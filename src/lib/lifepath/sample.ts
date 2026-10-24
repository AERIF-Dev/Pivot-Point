import type { LifePathData } from "./types";

/**
 * Fictional sample resident used for demos and judging.
 * Every value is illustrative and editable — not a real person or real offer.
 */
export function createSampleData(): LifePathData {
  return {
    version: 1,
    isSample: true,
    profile: {
      nickname: "Jordan (fictional sample)",
      currentTitle: "Production Associate — Auto Parts Manufacturing",
      previousJobs: "Machine Operator (3 yrs), Warehouse Associate (2 yrs)",
      yearsExperience: 8,
      tasks:
        "Perform in-process product inspections against spec sheets\nTroubleshoot and reset CNC and stamping machines when they fault\nCoordinate inventory counts and reorder parts for the line\nTrain new employees on safety procedures and station setup\nDocument defects and report quality issues to supervisors",
      tools:
        "Calipers and micrometers, go/no-go gauges, CNC machine controls, handheld barcode scanners, Excel, plant inventory system",
      skillsAndCerts: "Forklift certification, OSHA 10, lockout/tagout trained",
      preferredWorkTypes: "Hands-on, stable full-time, daytime hours",
      interests: "Quality control, process improvement, maybe leading a small team",
      location: "Detroit, MI",
      ownWords:
        "I've been on the line for eight years. I'm the person people ask when a machine acts up, and I usually catch defects before they ship. I want something steadier with room to grow, but I have a young kid so my hours matter.",
    },
    finances: {
      takeHomePercent: 78,
      secondIncomeMonthly: 0,
      housing: 950,
      utilities: 190,
      food: 450,
      insurance: 120,
      debtPayments: 125,
      otherExpenses: 100,
    },
    schedule: {
      needsChildcare: true,
      childcareOpen: "07:00",
      childcareClose: "18:00",
      dropoffBufferMinutes: 10,
      pickupBufferMinutes: 10,
      commitments: [],
      priorities: ["Be there for drop-off and pick-up", "Keep evenings with family", "Stable daytime hours"],
    },
    currentJob: {
      title: "Production Associate",
      hourlyWage: 20,
      hoursPerWeek: 40,
      shiftStart: "08:00",
      shiftEnd: "16:00",
      workDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      commuteMinutesRoundTrip: 40,
      transportationMonthly: 150,
      childcareMonthly: 400,
      otherJobCostsMonthly: 0,
      benefitsMonthlyChange: 0,
      benefitsNote: "",
    },
    offer: {
      title: "Quality Technician",
      hourlyWage: 25,
      hoursPerWeek: 40,
      shiftStart: "06:00",
      shiftEnd: "14:00",
      workDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      commuteMinutesRoundTrip: 100,
      transportationMonthly: 330,
      childcareMonthly: 850,
      otherJobCostsMonthly: 0,
      benefitsMonthlyChange: 0,
      benefitsNote: "",
    },
    targetImprovementMonthly: 300,
    appliedChanges: {},
    ai: {},
  };
}

/** Blank starting point after "Start fresh" or "Clear My Data". */
export function createEmptyData(): LifePathData {
  return {
    version: 1,
    isSample: false,
    profile: {
      nickname: "",
      currentTitle: "",
      previousJobs: "",
      yearsExperience: 0,
      tasks: "",
      tools: "",
      skillsAndCerts: "",
      preferredWorkTypes: "",
      interests: "",
      location: "Detroit, MI",
      ownWords: "",
    },
    finances: {
      takeHomePercent: 78,
      secondIncomeMonthly: 0,
      housing: 0,
      utilities: 0,
      food: 0,
      insurance: 0,
      debtPayments: 0,
      otherExpenses: 0,
    },
    schedule: {
      needsChildcare: false,
      childcareOpen: "07:00",
      childcareClose: "18:00",
      dropoffBufferMinutes: 10,
      pickupBufferMinutes: 10,
      commitments: [],
      priorities: [],
    },
    currentJob: {
      title: "",
      hourlyWage: 0,
      hoursPerWeek: 40,
      shiftStart: "09:00",
      shiftEnd: "17:00",
      workDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      commuteMinutesRoundTrip: 0,
      transportationMonthly: 0,
      childcareMonthly: 0,
      otherJobCostsMonthly: 0,
      benefitsMonthlyChange: 0,
      benefitsNote: "",
    },
    offer: {
      title: "",
      hourlyWage: 0,
      hoursPerWeek: 40,
      shiftStart: "09:00",
      shiftEnd: "17:00",
      workDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      commuteMinutesRoundTrip: 0,
      transportationMonthly: 0,
      childcareMonthly: 0,
      otherJobCostsMonthly: 0,
      benefitsMonthlyChange: 0,
      benefitsNote: "",
    },
    targetImprovementMonthly: 200,
    appliedChanges: {},
    ai: {},
  };
}
