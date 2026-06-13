import { NextResponse } from "next/server";
import { z } from "zod";

import { callGroq } from "@/lib/ai/groq";

export const runtime = "nodejs";

const requestSchema = z.object({
  rfpText: z.string().min(20),
  requiredProposalSections: z.array(z.string()).optional(),
  evaluationCriteria: z.array(z.string()).optional(),
  mandatoryRequirements: z.array(z.string()).optional(),
  sector: z.string().optional(),
});

export type ProposalPlanSection = {
  title: string;
  purpose: string;
  required: boolean;
  rationale: string;
  rfpRequirementsCovered: string[];
  suggestedWordCount: number;
  priority: "must-have" | "recommended" | "optional" | "skip";
};

export type ProposalPlan = {
  sections: ProposalPlanSection[];
  skippedSections: string[];
  planRationale: string;
};

const DEFAULT_SECTIONS = [
  "Cover Page",
  "Table of Contents",
  "Executive Summary",
  "Appreciation of the Project",
  "Understanding of Scope and Requirements",
  "Approach and Methodology",
  "Technical Work Plan",
  "Implementation Timeline",
  "Team Structure and Key Personnel",
  "Quality Assurance",
  "Risk Management",
  "Compliance Matrix",
  "Financial Proposal",
  "Company Profile and Relevant Experience",
  "Certifications and Registrations",
  "Annexures and Required Documents",
];

export async function POST(req: Request) {
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { rfpText, requiredProposalSections, evaluationCriteria, mandatoryRequirements, sector } = parsed.data;

  const raw = await callGroq(
    [
      {
        role: "system",
        content: `You are a Pakistani proposal planning expert. Given an RFP, determine exactly which proposal sections are required, recommended, optional, or should be skipped.
Output JSON only — no prose before or after.`,
      },
      {
        role: "user",
        content: `RFP context (sector: ${sector ?? "unknown"}):
${rfpText.slice(0, 8000)}

RFP-specified required sections (if any):
${requiredProposalSections?.join(", ") || "Not explicitly listed"}

Evaluation criteria:
${evaluationCriteria?.join(", ") || "Not extracted"}

Mandatory requirements summary:
${mandatoryRequirements?.slice(0, 10).join("; ") || "Not extracted"}

Available standard sections to assess:
${DEFAULT_SECTIONS.join(", ")}

For each section decide:
- required: true/false
- priority: "must-have" | "recommended" | "optional" | "skip"
- rationale: why include or skip (1 sentence)
- suggestedWordCount: approximate words for this section
- rfpRequirementsCovered: which requirement IDs or topics this covers
- purpose: what this section achieves

Return JSON:
{
  "sections": [
    {
      "title": "...",
      "purpose": "...",
      "required": true,
      "rationale": "...",
      "rfpRequirementsCovered": [],
      "suggestedWordCount": 300,
      "priority": "must-have"
    }
  ],
  "skippedSections": ["Section title", ...],
  "planRationale": "One paragraph explaining the overall proposal structure decision."
}`,
      },
    ],
    { temperature: 0.1 },
  );

  let plan: ProposalPlan;
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
    const data = JSON.parse(cleaned) as ProposalPlan;
    plan = {
      sections: Array.isArray(data.sections) ? data.sections : [],
      skippedSections: Array.isArray(data.skippedSections) ? data.skippedSections : [],
      planRationale: data.planRationale ?? "",
    };
  } catch {
    // Fallback: include all default sections
    plan = {
      sections: DEFAULT_SECTIONS.map((title) => ({
        title,
        purpose: "Standard proposal section",
        required: true,
        rationale: "Included as default — RFP-specific planning could not be parsed.",
        rfpRequirementsCovered: [],
        suggestedWordCount: 300,
        priority: "recommended" as const,
      })),
      skippedSections: [],
      planRationale: "Default plan used — AI planning response could not be parsed.",
    };
  }

  return NextResponse.json(plan);
}
