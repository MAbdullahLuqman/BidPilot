import { NextResponse } from "next/server";
import { z } from "zod";

import { callGroq } from "@/lib/ai/groq";

export const runtime = "nodejs";

const requestSchema = z.object({
  sectionTitle: z.string().min(1),
  currentHtml: z.string().min(1),
  improvementSuggestion: z.string().default(""),
  missingEvidence: z.array(z.string()).default([]),
  rfpText: z.string().default(""),
  companyProfile: z.string().default(""),
  capabilities: z.string().default(""),
  relevantRequirements: z.array(z.object({ id: z.string(), requirement: z.string(), mandatory: z.boolean() })).default([]),
});

export type ImproveSectionResponse = {
  html: string;
  evidenceUsed: string[];
  requirementsCovered: string[];
  missingEvidence: string[];
  confidenceScore: number;
  hallucinationRisk: "LOW" | "MEDIUM" | "HIGH";
  improvementSuggestion: string;
};

const SYSTEM_PROMPT = `You are BidPilot Pakistan, a senior proposal editor specializing in Pakistani government and private tenders.

You are rewriting a weak proposal section to make it stronger.

Rules:
- Fix weak evidence gaps — but never invent facts, certifications, or client names
- Where evidence is still missing, write [Evidence required: what is needed]
- Improve compliance wording to directly address mandatory requirements
- Make language more specific and direct — remove generic filler
- Return ONLY valid JSON:

{
  "html": "<p>...</p>",
  "evidenceUsed": ["string"],
  "requirementsCovered": ["REQ-ID"],
  "missingEvidence": ["string"],
  "confidenceScore": 0.0–1.0,
  "hallucinationRisk": "LOW" | "MEDIUM" | "HIGH",
  "improvementSuggestion": "string"
}`;

export async function POST(req: Request) {
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { sectionTitle, currentHtml, improvementSuggestion, missingEvidence, rfpText, companyProfile, capabilities, relevantRequirements } =
    parsed.data;

  const reqList = relevantRequirements.length
    ? relevantRequirements.map((r) => `- [${r.id}]${r.mandatory ? " MANDATORY" : ""}: ${r.requirement}`).join("\n")
    : "No specific requirements extracted.";

  const raw = await callGroq(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Section: "${sectionTitle}"

Current content (HTML):
${currentHtml.slice(0, 4000)}

Known improvement needed: ${improvementSuggestion || "Make this section stronger and more evidence-backed."}
Missing evidence items: ${missingEvidence.join("; ") || "None identified."}

Relevant requirements:
${reqList}

Company profile: ${companyProfile.slice(0, 2000) || "Not provided."}
Capabilities: ${capabilities.slice(0, 2000) || "Not provided."}
RFP context: ${rfpText.slice(0, 4000)}

Rewrite the section. Output JSON only.`,
      },
    ],
    { temperature: 0.2 },
  );

  let result: ImproveSectionResponse;
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
    result = JSON.parse(cleaned) as ImproveSectionResponse;
  } catch {
    result = {
      html: currentHtml,
      evidenceUsed: [],
      requirementsCovered: [],
      missingEvidence: ["JSON parse failed — content unchanged"],
      confidenceScore: 0.4,
      hallucinationRisk: "MEDIUM",
      improvementSuggestion: "Try regenerating — the AI response was malformed.",
    };
  }

  return NextResponse.json(result);
}
