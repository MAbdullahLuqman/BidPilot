import { NextResponse } from "next/server";
import { z } from "zod";

import { callGroq } from "@/lib/ai/groq";

export const runtime = "nodejs";

const requestSchema = z.object({
  sectionTitle: z.string().min(1),
  sectionPurpose: z.string().default(""),
  rfpText: z.string().min(20),
  companyName: z.string().default("The bidder"),
  companyProfile: z.string().default(""),
  relevantRequirements: z.array(z.object({ id: z.string(), requirement: z.string(), mandatory: z.boolean() })).default([]),
  capabilities: z.string().default(""),
  styleNotes: z.string().default(""),
});

export type GenerateSectionRequest = z.infer<typeof requestSchema>;

export type GenerateSectionResponse = {
  html: string;
  evidenceUsed: string[];
  requirementsCovered: string[];
  missingEvidence: string[];
  confidenceScore: number;
  hallucinationRisk: "LOW" | "MEDIUM" | "HIGH";
  improvementSuggestion: string;
};

const SYSTEM_PROMPT = `You are BidPilot Pakistan, a senior proposal writer for Pakistani government and private tenders.

Rules you MUST follow:
- Write in formal Pakistani tender proposal style — specific, grounded, direct.
- Never invent certifications, client names, project values, team members, or financial figures.
- If evidence is missing, write exactly: [Evidence required: describe what is missing]
- Avoid: cutting-edge, seamless, robust, leverage, comprehensive solution, innovative platform, world-class, transform, unlock potential.
- Use: specific dates, named deliverables, traceable methodology, clear compliance language.
- Return ONLY valid JSON matching the schema below. No prose before or after.

Output JSON schema:
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

  const { sectionTitle, sectionPurpose, rfpText, companyName, companyProfile, relevantRequirements, capabilities, styleNotes } = parsed.data;

  const reqList = relevantRequirements.length
    ? relevantRequirements.map((r) => `- [${r.id}]${r.mandatory ? " MANDATORY" : ""}: ${r.requirement}`).join("\n")
    : "No specific requirements extracted yet.";

  const raw = await callGroq(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Section to write: "${sectionTitle}"
Section purpose: ${sectionPurpose || "Address the relevant RFP requirements for this section."}

Company: ${companyName}
Company profile: ${companyProfile.slice(0, 3000) || "Not provided."}
Capabilities/evidence: ${capabilities.slice(0, 3000) || "Not provided."}

Relevant RFP requirements:
${reqList}

RFP text excerpt:
${rfpText.slice(0, 8000)}

Style notes: ${styleNotes || "Professional Pakistani tender proposal style."}

Write the "${sectionTitle}" section. Output JSON only.`,
      },
    ],
    { temperature: 0.2 },
  );

  let result: GenerateSectionResponse;
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
    result = JSON.parse(cleaned) as GenerateSectionResponse;
  } catch {
    // Fallback: wrap raw text as HTML if JSON parse fails
    result = {
      html: `<p>${raw.slice(0, 4000)}</p>`,
      evidenceUsed: [],
      requirementsCovered: [],
      missingEvidence: ["JSON parse failed — review raw content"],
      confidenceScore: 0.4,
      hallucinationRisk: "MEDIUM",
      improvementSuggestion: "Regenerate this section for better structured output.",
    };
  }

  return NextResponse.json(result);
}
