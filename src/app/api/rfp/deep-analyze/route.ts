import { NextResponse } from "next/server";
import { z } from "zod";

import { callGroq } from "@/lib/ai/groq";
import { callGemini } from "@/lib/ai/gemini";

export const runtime = "nodejs";
export const maxDuration = 120;

const requestSchema = z.object({
  rfpText: z.string().min(30),
  sector: z.string().optional(),
  // If true, rfpText contains [PAGE N] markers from the page-level extractor
  hasPageMarkers: z.boolean().optional().default(false),
});

export type DeepRequirement = {
  id: string;
  requirementText: string;
  normalizedRequirement: string;
  category:
    | "mandatory"
    | "technical"
    | "financial"
    | "eligibility"
    | "compliance"
    | "experience"
    | "team"
    | "document"
    | "other";
  mandatory: boolean;
  sourcePage: string | null;
  sourceSection: string | null;
  evidenceNeeded: string | null;
  disqualificationRisk: boolean;
  proposalSectionImpacted: string | null;
};

export type DeepAnalysisResult = {
  tenderTitle: string | null;
  issuingOrganization: string | null;
  submissionDeadline: string | null;
  preBidMeetingDate: string | null;
  bidSecurity: string | null;
  budget: string | null;
  contractDuration: string | null;
  scopeOfWork: string | null;
  deliverables: string[];
  submissionMethod: string | null;
  contactDetails: string | null;
  evaluationCriteria: Array<{ criterion: string; weight: string | null }>;
  requiredDocuments: string[];
  requiredCertifications: string[];
  requiredExperience: string[];
  requiredTeamRoles: string[];
  disqualificationClauses: string[];
  requirements: DeepRequirement[];
  missedItemsAudit: string[];
  analysisConfidence: number;
};

function safeParseJson<T>(raw: string): T | null {
  try {
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    // Try extracting JSON object/array from the text
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

const PASS1_SYSTEM = `You are a Pakistani procurement document analyst. Extract structured tender overview data as strict JSON. Never invent missing details — use null or [] when unavailable. Output JSON only, no prose.`;

const PASS2_SYSTEM = `You are a Pakistani procurement requirements analyst. Extract every requirement from the tender text as a JSON array. Each requirement must be specific, traceable, and non-duplicated. Output JSON only, no prose.`;

const PASS3_SYSTEM = `You are a senior Pakistani procurement auditor performing a missed-requirement review. You will be given a tender text and the requirements already extracted. Identify anything missed: hidden eligibility clauses, submission conditions, disqualification risks, date/deadline items, evaluation sub-criteria, or required forms that were overlooked. Output JSON only.`;

export async function POST(req: Request) {
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { rfpText, sector, hasPageMarkers } = parsed.data;
  const textSlice = rfpText.slice(0, 16000);

  const pageNote = hasPageMarkers
    ? "The text contains [PAGE N] markers showing the exact PDF page each section appears on. Use these to populate sourcePage fields accurately."
    : "No page markers available — use null for sourcePage.";

  // ── Pass 0: Gemini parallel overview (runs concurrently with Pass 1) ─
  // Only runs if GEMINI_API_KEY is set — graceful skip if not configured
  let geminiOverview: Partial<DeepAnalysisResult> = {};
  const geminiAvailable = !!process.env.GEMINI_API_KEY;
  const geminiOverviewPromise: Promise<void> = geminiAvailable
    ? callGemini(
        `You are a Pakistani procurement analyst. Extract a comprehensive tender overview as strict JSON.
${pageNote}

Sector: ${sector ?? "unknown"}
Extract:
{
  "tenderTitle": string|null, "issuingOrganization": string|null,
  "submissionDeadline": string|null, "preBidMeetingDate": string|null,
  "bidSecurity": string|null, "budget": string|null, "contractDuration": string|null,
  "scopeOfWork": string|null, "deliverables": string[],
  "submissionMethod": string|null, "contactDetails": string|null,
  "evaluationCriteria": [{"criterion": string, "weight": string|null}],
  "requiredDocuments": string[], "requiredCertifications": string[],
  "requiredExperience": string[], "requiredTeamRoles": string[],
  "disqualificationClauses": string[]
}

Tender text:
${textSlice}`,
        { temperature: 0.05, systemInstruction: "Output strict JSON only. Never invent missing details — use null or []." },
      )
        .then((raw) => {
          const g = safeParseJson<Partial<DeepAnalysisResult>>(raw);
          if (g) geminiOverview = g;
        })
        .catch(() => {})
    : Promise.resolve();

  // ── Pass 1: Document overview (Groq) ───────────────────────────────
  let overview: Partial<DeepAnalysisResult> = {};
  try {
    const raw1 = await callGroq(
      [
        { role: "system", content: PASS1_SYSTEM + " " + pageNote },
        {
          role: "user",
          content: `Sector: ${sector ?? "unknown"}

Extract the following from this tender document as JSON:
{
  "tenderTitle": string | null,
  "issuingOrganization": string | null,
  "submissionDeadline": string | null,
  "preBidMeetingDate": string | null,
  "bidSecurity": string | null,
  "budget": string | null,
  "contractDuration": string | null,
  "scopeOfWork": string | null,
  "deliverables": string[],
  "submissionMethod": string | null,
  "contactDetails": string | null,
  "evaluationCriteria": [{ "criterion": string, "weight": string | null }],
  "requiredDocuments": string[],
  "requiredCertifications": string[],
  "requiredExperience": string[],
  "requiredTeamRoles": string[],
  "disqualificationClauses": string[]
}

Tender text:
${textSlice}`,
        },
      ],
      { temperature: 0.05 },
    );
    overview = safeParseJson<Partial<DeepAnalysisResult>>(raw1) ?? {};
  } catch {
    // continue with empty overview
  }

  // Wait for Gemini pass 0 to finish, then merge (Gemini fills gaps Groq left as null)
  await geminiOverviewPromise;
  if (geminiAvailable) {
    // Merge: prefer non-null Groq value, fall back to Gemini value
    const mergeField = <T>(groqVal: T, geminiVal: T): T =>
      groqVal !== null && groqVal !== undefined && (Array.isArray(groqVal) ? (groqVal as unknown[]).length > 0 : true)
        ? groqVal
        : geminiVal;
    overview = {
      tenderTitle: mergeField(overview.tenderTitle, geminiOverview.tenderTitle),
      issuingOrganization: mergeField(overview.issuingOrganization, geminiOverview.issuingOrganization),
      submissionDeadline: mergeField(overview.submissionDeadline, geminiOverview.submissionDeadline),
      preBidMeetingDate: mergeField(overview.preBidMeetingDate, geminiOverview.preBidMeetingDate),
      bidSecurity: mergeField(overview.bidSecurity, geminiOverview.bidSecurity),
      budget: mergeField(overview.budget, geminiOverview.budget),
      contractDuration: mergeField(overview.contractDuration, geminiOverview.contractDuration),
      scopeOfWork: mergeField(overview.scopeOfWork, geminiOverview.scopeOfWork),
      deliverables: mergeField(overview.deliverables, geminiOverview.deliverables),
      submissionMethod: mergeField(overview.submissionMethod, geminiOverview.submissionMethod),
      contactDetails: mergeField(overview.contactDetails, geminiOverview.contactDetails),
      evaluationCriteria: mergeField(overview.evaluationCriteria, geminiOverview.evaluationCriteria),
      requiredDocuments: mergeField(overview.requiredDocuments, geminiOverview.requiredDocuments),
      requiredCertifications: mergeField(overview.requiredCertifications, geminiOverview.requiredCertifications),
      requiredExperience: mergeField(overview.requiredExperience, geminiOverview.requiredExperience),
      requiredTeamRoles: mergeField(overview.requiredTeamRoles, geminiOverview.requiredTeamRoles),
      disqualificationClauses: mergeField(overview.disqualificationClauses, geminiOverview.disqualificationClauses),
    };
  }

  // ── Pass 2: Requirement registry ───────────────────────────────────
  let requirements: DeepRequirement[] = [];
  try {
    const raw2 = await callGroq(
      [
        { role: "system", content: PASS2_SYSTEM + " " + pageNote },
        {
          role: "user",
          content: `Extract every distinct requirement from this tender as a JSON array of objects with this schema:
{
  "id": "REQ-001",
  "requirementText": "exact text from tender",
  "normalizedRequirement": "clear, concise restatement",
  "category": "mandatory|technical|financial|eligibility|compliance|experience|team|document|other",
  "mandatory": true|false,
  "sourcePage": "page X" | null,
  "sourceSection": "section name" | null,
  "evidenceNeeded": "what document/proof is needed" | null,
  "disqualificationRisk": true|false,
  "proposalSectionImpacted": "which proposal section should address this" | null
}

Extract at minimum: eligibility clauses, mandatory documents, technical requirements, financial requirements, evaluation criteria items, submission conditions, certification requirements, experience requirements, team requirements.

Tender text:
${textSlice}`,
        },
      ],
      { temperature: 0.05 },
    );

    const parsed2 = safeParseJson<DeepRequirement[]>(raw2);
    if (Array.isArray(parsed2)) {
      requirements = parsed2.map((r, i) => ({
        id: r.id ?? `REQ-${String(i + 1).padStart(3, "0")}`,
        requirementText: r.requirementText ?? "",
        normalizedRequirement: r.normalizedRequirement ?? r.requirementText ?? "",
        category: r.category ?? "other",
        mandatory: r.mandatory ?? false,
        sourcePage: r.sourcePage ?? null,
        sourceSection: r.sourceSection ?? null,
        evidenceNeeded: r.evidenceNeeded ?? null,
        disqualificationRisk: r.disqualificationRisk ?? false,
        proposalSectionImpacted: r.proposalSectionImpacted ?? null,
      }));
    }
  } catch {
    // continue
  }

  // ── Pass 3: Missed requirement audit ───────────────────────────────
  let missedItemsAudit: string[] = [];
  try {
    const alreadyExtracted = requirements.slice(0, 30).map((r) => r.requirementText).join("\n");
    const raw3 = await callGroq(
      [
        { role: "system", content: PASS3_SYSTEM + " " + pageNote },
        {
          role: "user",
          content: `Already extracted requirements:
${alreadyExtracted}

Review the original tender text again and identify missed items. Return JSON:
{ "missedItems": ["description of missed item 1", "..."] }

Look specifically for:
- Hidden eligibility clauses
- Submission envelope/format requirements
- Bid validity period
- Performance bond/guarantee
- Liquidated damages clauses
- Language/format requirements
- Required annexures/forms not in required documents list
- Dates and deadlines not yet captured

Tender text:
${textSlice.slice(0, 10000)}`,
        },
      ],
      { temperature: 0.05 },
    );

    const parsed3 = safeParseJson<{ missedItems?: string[] }>(raw3);
    if (parsed3?.missedItems && Array.isArray(parsed3.missedItems)) {
      missedItemsAudit = parsed3.missedItems;

      // Append missed items as UNKNOWN requirements
      const offset = requirements.length;
      for (const missed of parsed3.missedItems.slice(0, 15)) {
        if (missed && !requirements.some((r) => r.requirementText === missed)) {
          requirements.push({
            id: `REQ-${String(offset + requirements.length - offset + 1).padStart(3, "0")}`,
            requirementText: missed,
            normalizedRequirement: missed,
            category: "other",
            mandatory: false,
            sourcePage: null,
            sourceSection: "Missed — audit pass",
            evidenceNeeded: "Review tender and confirm whether this applies.",
            disqualificationRisk: false,
            proposalSectionImpacted: null,
          });
        }
      }
    }
  } catch {
    // continue
  }

  const result: DeepAnalysisResult = {
    tenderTitle: overview.tenderTitle ?? null,
    issuingOrganization: overview.issuingOrganization ?? null,
    submissionDeadline: overview.submissionDeadline ?? null,
    preBidMeetingDate: overview.preBidMeetingDate ?? null,
    bidSecurity: overview.bidSecurity ?? null,
    budget: overview.budget ?? null,
    contractDuration: overview.contractDuration ?? null,
    scopeOfWork: overview.scopeOfWork ?? null,
    deliverables: overview.deliverables ?? [],
    submissionMethod: overview.submissionMethod ?? null,
    contactDetails: overview.contactDetails ?? null,
    evaluationCriteria: overview.evaluationCriteria ?? [],
    requiredDocuments: overview.requiredDocuments ?? [],
    requiredCertifications: overview.requiredCertifications ?? [],
    requiredExperience: overview.requiredExperience ?? [],
    requiredTeamRoles: overview.requiredTeamRoles ?? [],
    disqualificationClauses: overview.disqualificationClauses ?? [],
    requirements,
    missedItemsAudit,
    analysisConfidence: requirements.length > 5 ? 0.82 : requirements.length > 0 ? 0.6 : 0.2,
  };

  return NextResponse.json(result);
}
