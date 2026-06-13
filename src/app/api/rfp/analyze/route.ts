import { NextResponse } from "next/server";
import { z } from "zod";

import { callGroq } from "@/lib/ai/groq";

export const runtime = "nodejs";

const requestSchema = z.object({
  rfpText: z.string().min(50),
  sector: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 });
  }

  const raw = await callGroq(
    [
      {
        role: "system",
        content:
          "Extract RFP/tender data as strict JSON only. Do not invent missing details. Use null or [] when unavailable.",
      },
      {
        role: "user",
        content: `Sector: ${parsed.data.sector ?? "unknown"}
Extract a rich tender analysis JSON with these keys:
summary, issuingOrganization, tenderTitle, submissionDeadline, budget, locations, projectObjectives, scopeOfWork, deliverables, contractDuration, eligibilityCriteria, mandatoryRequirements, technicalRequirements, financialRequirements, requiredDocuments, evaluationCriteria, evaluationWeights, complianceClauses, disqualificationRisks, requiredCertifications, requiredPastExperience, requiredTeamRoles, importantDates, contactDetails, questionsAndAnswers, requiredProposalSections, constructionSpecific, itSpecific, missingInformation.

RFP text:
${parsed.data.rfpText.slice(0, 14000)}`,
      },
    ],
    { temperature: 0.1 },
  );

  try {
    return NextResponse.json({ analysis: JSON.parse(raw) });
  } catch {
    return NextResponse.json({ analysisText: raw, warning: "model_returned_non_json" });
  }
}
