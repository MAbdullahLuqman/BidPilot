/**
 * POST /api/proposal/pipeline
 *
 * Full multi-LLM proposal generation pipeline:
 *   Stage 1 — reads existing parsed RFP data from request (already parsed by /api/rfp/parse)
 *   Stage 2 — Grok: deep tender strategy analysis
 *   Stage 3 — Gemini 2.5 Flash: section-by-section HTML generation
 *   Stage 4 — injects sections into the existing premium HTML template
 *
 * Returns: { sections: StoredProposalSection[], proposalHtml: string }
 * The frontend saves sections via saveStoredProposalDraft (existing client-storage flow).
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { callGrok } from "@/lib/ai/grok";
import { callGemini } from "@/lib/ai/gemini";
import type { StoredProposalSection } from "@/lib/client-storage";

export const runtime = "nodejs";
export const maxDuration = 300;

// ── Zod schema — matches real StoredCompany fields from client-storage.ts ──

const pastProjectSchema = z.object({
  title: z.string().default(""),
  clientName: z.string().default(""),
  clientType: z.string().default(""),
  sector: z.string().default(""),
  projectValue: z.string().default(""),
  yearCompleted: z.string().default(""),
  durationMonths: z.string().default(""),
  scopeSummary: z.string().default(""),
  evidenceUploaded: z.boolean().default(false),
  performanceCertAvailable: z.boolean().default(false),
});

const companySchema = z.object({
  companyName: z.string().min(1),
  tradingName: z.string().default(""),
  category: z.string().default(""),
  sector: z.string().default(""),
  city: z.string().default(""),
  country: z.string().default("Pakistan"),
  websiteUrl: z.string().default(""),
  contactPerson: z.string().default(""),
  contactEmail: z.string().default(""),
  phone: z.string().default(""),
  ntn: z.string().default(""),
  strn: z.string().default(""),
  secp: z.string().default(""),
  pecCategory: z.string().default(""),
  otherLicenses: z.string().default(""),
  isoCertifications: z.string().default(""),
  otherCertifications: z.string().default(""),
  customCertificates: z.array(z.string()).default([]),
  vendorRegistrations: z.string().default(""),
  mainServices: z.string().default(""),
  secondaryServices: z.string().default(""),
  industriesServed: z.string().default(""),
  geographicCoverage: z.string().default(""),
  yearsInBusiness: z.string().default(""),
  numEmployees: z.string().default(""),
  keyExperts: z.string().default(""),
  description: z.string().default(""),
  financialDocsAvailable: z.boolean().default(false),
  bankStatementsAvailable: z.boolean().default(false),
  pastProjects: z.array(pastProjectSchema).default([]),
});

const requirementSchema = z.object({
  id: z.string(),
  requirement: z.string(),
  mandatory: z.boolean(),
  status: z.enum(["PASS", "PARTIAL", "FAIL", "UNKNOWN"]),
  evidence: z.string().default(""),
  action: z.string().default(""),
  confidence: z.number().default(0.5),
});

const requestSchema = z.object({
  // The RFP text already parsed by /api/rfp/parse (with [PAGE N] markers)
  rfpText: z.string().min(50),
  // Workspace metadata
  workspaceId: z.string(),
  workspaceTitle: z.string().default("Untitled RFP"),
  issuer: z.string().default("Procuring Agency"),
  sector: z.string().default(""),
  // Already extracted requirements from /api/rfp/deep-analyze
  requirements: z.array(requirementSchema).default([]),
  // Real company profile from StoredCompany
  company: companySchema,
  // Optional: override which sections to generate
  sectionKeys: z.array(z.string()).optional(),
});

export type PipelineRequest = z.infer<typeof requestSchema>;

export type PipelineResponse = {
  success: true;
  sections: StoredProposalSection[];
  grokStrategy: GrokStrategy;
};

// ── Proposal sections — adapted to existing StoredProposalSection shape ──────

type SectionDef = {
  key: string;
  title: string;
  purpose: string;
};

const PROPOSAL_SECTIONS: SectionDef[] = [
  {
    key: "coverPage",
    title: "Cover Page",
    purpose: "Professional cover page with company name, tender title, issuer, submission date, and company contact details. No fabricated content.",
  },
  {
    key: "executiveSummary",
    title: "Executive Summary",
    purpose: "Concise 3–5 paragraph summary covering: who we are, what this tender is for, why we are qualified, and our key differentiators grounded in company profile data.",
  },
  {
    key: "understandingOfTender",
    title: "Understanding of the Tender",
    purpose: "Demonstrate deep understanding of the client's objectives, constraints, mandatory requirements, and procurement context. Reference specific RFP clauses.",
  },
  {
    key: "proposedSolution",
    title: "Proposed Solution",
    purpose: "Describe the specific solution or service being offered. Ground every claim in the company's actual services, certifications, and past projects.",
  },
  {
    key: "technicalApproach",
    title: "Technical Approach and Methodology",
    purpose: "Detailed methodology: phases, activities, deliverables, tools, standards referenced, quality checkpoints. Align explicitly with mandatory RFP requirements.",
  },
  {
    key: "implementationPlan",
    title: "Implementation Plan",
    purpose: "Phased delivery plan with activities, responsibilities, inputs, and outputs per phase. No fabricated dates — use relative timelines (Week 1, Month 2, etc.).",
  },
  {
    key: "projectTimeline",
    title: "Project Timeline",
    purpose: "HTML table showing phases, key milestones, and duration. Use relative weeks/months. Flag where the actual deadline from the tender applies.",
  },
  {
    key: "riskManagement",
    title: "Risk Management",
    purpose: "Risk register table: identified risks, probability, impact, mitigation measures, and contingency. Include both technical and procurement risks.",
  },
  {
    key: "qualityAssurance",
    title: "Quality Assurance",
    purpose: "QA framework: standards used, review gates, acceptance criteria, reporting cadence, and how quality is demonstrated to the client.",
  },
  {
    key: "complianceMatrix",
    title: "Compliance Matrix",
    purpose: "Table mapping every mandatory RFP requirement to the company's evidence. Mark gaps with [Evidence required: description] rather than fabricating.",
  },
  {
    key: "conclusion",
    title: "Conclusion and Next Steps",
    purpose: "Professional closing paragraph, commitment statement, and a clear next steps section. Invite the client to proceed and provide contact details.",
  },
];

// ── Grok strategy type ────────────────────────────────────────────────────────

type GrokStrategy = {
  tenderTitle: string;
  clientName: string;
  deadline: string | null;
  coreRequirements: string[];
  mandatoryCompliance: string[];
  qualificationFit: string;
  winProbability: string;
  topPainPoints: string[];
  buyerPriorities: string[];
  majorRisks: string[];
  winThemes: string[];
  deliveryApproach: string;
  mustInclude: string[];
  mustExclude: string[];
  missingCompanyData: string[];
  proposalStrategy: string;
};

// ── Company profile serializer ────────────────────────────────────────────────

function serializeCompany(c: z.infer<typeof companySchema>): string {
  const certs = [c.isoCertifications, c.otherCertifications, ...c.customCertificates]
    .filter(Boolean).join(", ");

  const projects = c.pastProjects.length
    ? c.pastProjects.map((p, i) =>
        `  ${i + 1}. "${p.title}" — Client: ${p.clientName} (${p.sector})` +
        (p.projectValue ? `, PKR ${p.projectValue}` : "") +
        (p.yearCompleted ? `, ${p.yearCompleted}` : "") +
        (p.scopeSummary ? `\n     Scope: ${p.scopeSummary}` : "")
      ).join("\n")
    : "  None provided.";

  return `Company: ${c.companyName}${c.tradingName ? ` (${c.tradingName})` : ""}
Sector: ${c.sector || "Not specified"}
Location: ${[c.city, c.country].filter(Boolean).join(", ")}
Years in business: ${c.yearsInBusiness || "Not specified"}
Team size: ${c.numEmployees || "Not specified"}
NTN: ${c.ntn || "NOT PROVIDED"} | STRN: ${c.strn || "NOT PROVIDED"} | SECP: ${c.secp || "NOT PROVIDED"}
PEC category: ${c.pecCategory || "Not provided"}
Other licenses: ${c.otherLicenses || "None"}
Certifications: ${certs || "None listed"}
Vendor registrations: ${c.vendorRegistrations || "None"}
Core services: ${c.mainServices || "Not specified"}
Secondary services: ${c.secondaryServices || "Not specified"}
Industries served: ${c.industriesServed || "Not specified"}
Geographic coverage: ${c.geographicCoverage || "Not specified"}
Key experts: ${c.keyExperts || "Not specified"}
Description: ${c.description || "Not provided"}
Audited financials: ${c.financialDocsAvailable ? "Available" : "Not confirmed"}
Bank statements: ${c.bankStatementsAvailable ? "Available" : "Not confirmed"}
Past projects:
${projects}`;
}

// ── Stage 2: Grok analysis ────────────────────────────────────────────────────

async function runGrokAnalysis(
  rfpText: string,
  companyProfile: string,
  requirements: z.infer<typeof requirementSchema>[],
  issuer: string,
  sector: string,
): Promise<GrokStrategy> {
  const mandatoryList = requirements
    .filter((r) => r.mandatory)
    .slice(0, 25)
    .map((r) => `- [${r.id}] ${r.requirement}`)
    .join("\n");

  const raw = await callGrok(
    [
      {
        role: "system",
        content: `You are a senior RFP/tender strategist specializing in Pakistani government and corporate procurement.
Your job is to analyze a tender document and a company profile, then produce a concise strategy JSON object for use by a proposal writing AI.
You do NOT write the proposal. You only analyze, identify, and strategize.
Output strict JSON only — no prose, no markdown, no code fences.`,
      },
      {
        role: "user",
        content: `TENDER / RFP TEXT (up to 14,000 chars):
${rfpText.slice(0, 14000)}

ISSUER: ${issuer}
SECTOR: ${sector || "Unknown"}

MANDATORY REQUIREMENTS ALREADY EXTRACTED:
${mandatoryList || "Not extracted yet."}

COMPANY PROFILE:
${companyProfile}

Analyze the above and return this exact JSON structure:
{
  "tenderTitle": "string",
  "clientName": "string",
  "deadline": "string or null",
  "coreRequirements": ["top 6 core deliverables from RFP"],
  "mandatoryCompliance": ["top mandatory compliance items — NTN, PEC, ISO etc."],
  "qualificationFit": "STRONG / MODERATE / WEAK — one sentence explanation",
  "winProbability": "HIGH / MEDIUM / LOW — with one sentence reasoning",
  "topPainPoints": ["3–4 buyer pain points the proposal must address"],
  "buyerPriorities": ["3–4 ranked buyer priorities from the RFP"],
  "majorRisks": ["3–4 risks that could lose the bid"],
  "winThemes": ["3–4 key messages the proposal must consistently push"],
  "deliveryApproach": "1–2 sentence recommended delivery/technical approach",
  "mustInclude": ["items that absolutely must appear in the proposal"],
  "mustExclude": ["items that should NOT be in the proposal — irrelevant sections, unsubstantiated claims"],
  "missingCompanyData": ["company data fields that are empty but required for this bid"],
  "proposalStrategy": "2–3 sentence overall proposal strategy"
}`,
      },
    ],
    { temperature: 0.1, maxTokens: 2048 },
  );

  try {
    const cleaned = raw
      .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
    return JSON.parse(cleaned) as GrokStrategy;
  } catch {
    // Graceful fallback strategy
    return {
      tenderTitle: issuer ? `${issuer} Tender` : "Tender",
      clientName: issuer,
      deadline: null,
      coreRequirements: ["Address all RFP requirements"],
      mandatoryCompliance: ["Submit required documents"],
      qualificationFit: "Moderate — review company profile completeness",
      winProbability: "MEDIUM",
      topPainPoints: ["Timely delivery", "Technical competency", "Cost effectiveness"],
      buyerPriorities: ["Compliance", "Experience", "Technical approach"],
      majorRisks: ["Missing certifications", "Incomplete evidence"],
      winThemes: ["Proven experience", "Technical strength", "Compliance readiness"],
      deliveryApproach: "Structured phased approach aligned with RFP requirements.",
      mustInclude: ["Cover page", "Technical approach", "Compliance matrix"],
      mustExclude: ["Unsubstantiated claims", "Irrelevant services"],
      missingCompanyData: [],
      proposalStrategy: "Focus on compliance, experience, and technical fit.",
    };
  }
}

// ── Stage 3: Gemini section generation ───────────────────────────────────────

async function generateSection(
  sectionDef: SectionDef,
  rfpText: string,
  companyProfile: string,
  strategy: GrokStrategy,
  requirements: z.infer<typeof requirementSchema>[],
  company: z.infer<typeof companySchema>,
): Promise<StoredProposalSection> {
  // Pick requirements most relevant to this section (avoid sending all 50+ to Gemini)
  const relevantReqs = requirements
    .filter((r) => {
      const lower = `${sectionDef.title} ${sectionDef.purpose}`.toLowerCase();
      return r.mandatory ||
        lower.includes(r.requirement.toLowerCase().slice(0, 20)) ||
        (sectionDef.key === "complianceMatrix");
    })
    .slice(0, 20)
    .map((r) => `[${r.id}]${r.mandatory ? " MANDATORY" : ""}: ${r.requirement} (Evidence: ${r.evidence || "none"})`)
    .join("\n");

  const prompt = `You are writing a professional tender proposal for "${strategy.tenderTitle}" submitted by "${company.companyName}" to "${strategy.clientName}".

SECTION TO WRITE: "${sectionDef.title}"
PURPOSE: ${sectionDef.purpose}

PROPOSAL STRATEGY (from RFP analysis):
- Win themes: ${strategy.winThemes.join("; ")}
- Buyer priorities: ${strategy.buyerPriorities.join("; ")}
- Delivery approach: ${strategy.deliveryApproach}
- Must include: ${strategy.mustInclude.join("; ")}
- Must NOT include: ${strategy.mustExclude.join("; ")}

COMPANY PROFILE:
${companyProfile}

RELEVANT REQUIREMENTS:
${relevantReqs || "Address the general scope of this tender section."}

RFP CONTEXT (excerpt):
${rfpText.slice(0, 6000)}

STRICT RULES:
1. Output ONLY clean HTML — no markdown, no code fences, no JSON, no explanations.
2. Never mention win probability, confidence scores, NO-GO, missing evidence, hallucination risk, "AI-assisted", or "pending review". These are internal only and must NEVER appear in the proposal.
3. Never invent certifications, staff names, project values, client names, or financial figures not present in the company profile.
4. If evidence for a claim is missing from the company profile, simply omit that claim entirely. Do not write placeholders like [Evidence required], [Name], or UNKNOWN.
5. Write in formal government procurement language — clear, specific, professional.
6. Only include information supported by the company profile or the RFP text.
7. Use <h2> for the section title, <h3> for subsections, <p> for paragraphs, <ul>/<ol> for lists, <table> for matrices.
8. Be specific and concise — quality over quantity. Target 200–400 words for narrative sections, full tables for matrices.
9. Use the company's actual data. Do not use placeholder names like "XYZ Company".

Write the "${sectionDef.title}" section now. HTML only:`;

  let html = "";
  try {
    html = await callGemini(prompt, {
      model: "gemini-2.5-flash-preview-05-20",
      temperature: 0.2,
      systemInstruction: "Output only clean HTML fragments. No markdown. No explanations. No code fences.",
    });

    // Strip accidental markdown fences if Gemini adds them
    html = html
      .replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();

    // Strip internal markers that must never appear in the exported proposal
    html = html
      .replace(/\[Evidence required:[^\]]*\]/gi, "")
      .replace(/\[Name\]/gi, "")
      .replace(/\bUNKNOWN\b/g, "")
      .replace(/\bNO-GO\b/gi, "")
      .replace(/win probability[^<]*/gi, "")
      .replace(/hallucination risk[^<]*/gi, "")
      .replace(/confidence score[^<]*/gi, "")
      .replace(/pending review/gi, "")
      .replace(/ai-assisted/gi, "")
      .replace(/\bAI assisted\b/gi, "")
      .trim();

    // Fallback: if Gemini returned something that looks like plain text, wrap it
    if (!html.startsWith("<")) {
      html = `<p>${html}</p>`;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    html = `<p class="evidence-gap">[Section generation failed: ${msg}]</p>`;
  }

  // Compute confidence based on how much real company data was available
  const hasServices = !!company.mainServices;
  const hasCerts = !!(company.isoCertifications || company.otherCertifications || company.customCertificates.length);
  const hasProjects = company.pastProjects.length > 0;
  const hasLegal = !!(company.ntn && company.secp);
  const dataScore = [hasServices, hasCerts, hasProjects, hasLegal].filter(Boolean).length;
  const confidence = 0.5 + dataScore * 0.1;

  const missingEvidence = strategy.missingCompanyData.length
    ? strategy.missingCompanyData
    : html.includes("Evidence required")
      ? ["Some evidence gaps detected — review [Evidence required] markers in this section."]
      : [];

  return {
    id: sectionDef.key,
    title: sectionDef.title,
    html,
    confidence,
    sources: ["Gemini 2.5 Flash", "Grok strategy", "Company profile", "RFP text"],
    evidenceStatus: missingEvidence.length ? "NEEDS_EVIDENCE" : "REVIEW",
    requirementsCovered: requirements
      .filter((r) => r.mandatory)
      .slice(0, 5)
      .map((r) => r.id),
    evidenceUsed: [
      company.mainServices ? "Core services" : "",
      hasCerts ? "Certifications" : "",
      hasProjects ? "Past projects" : "",
    ].filter(Boolean),
    missingEvidence,
    hallucinationRisk: confidence >= 0.8 ? "LOW" : confidence >= 0.65 ? "MEDIUM" : "HIGH",
    improvementSuggestion: missingEvidence.length
      ? `Complete company profile (${strategy.missingCompanyData.join(", ")}) to strengthen this section.`
      : "Section generated — review and approve before export.",
    approved: false,
  };
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // ── API key guards ──────────────────────────────────────────────────────────
  const missingKeys: string[] = [];
  if (!process.env.XAI_API_KEY) missingKeys.push("XAI_API_KEY");
  if (!process.env.GEMINI_API_KEY) missingKeys.push("GEMINI_API_KEY");
  if (missingKeys.length) {
    return NextResponse.json(
      { success: false, stage: "init", error: `Missing environment variables: ${missingKeys.join(", ")}` },
      { status: 503 },
    );
  }

  // ── Parse & validate request body ──────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, stage: "request_parse", error: "Request body is not valid JSON." },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, stage: "request_validation", error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { rfpText, workspaceTitle, issuer, sector, requirements, company, sectionKeys } = parsed.data;

  // Determine which sections to generate
  const sectionsToRun = sectionKeys?.length
    ? PROPOSAL_SECTIONS.filter((s) => sectionKeys.includes(s.key))
    : PROPOSAL_SECTIONS;

  if (!sectionsToRun.length) {
    return NextResponse.json(
      { success: false, stage: "section_selection", error: "No valid sections selected." },
      { status: 400 },
    );
  }

  const companyProfile = serializeCompany(company);

  // ── Stage 2: Grok strategy analysis ────────────────────────────────────────
  let grokStrategy: GrokStrategy;
  try {
    grokStrategy = await runGrokAnalysis(rfpText, companyProfile, requirements, issuer, sector);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Grok analysis failed";
    return NextResponse.json(
      { success: false, stage: "grok_analysis", error: message },
      { status: 502 },
    );
  }

  // ── Stage 3: Gemini section-by-section generation ───────────────────────────
  const generatedSections: StoredProposalSection[] = [];
  const sectionErrors: { key: string; error: string }[] = [];

  for (const sectionDef of sectionsToRun) {
    try {
      const section = await generateSection(
        sectionDef,
        rfpText,
        companyProfile,
        grokStrategy,
        requirements,
        company,
      );
      generatedSections.push(section);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[pipeline] Section "${sectionDef.key}" failed:`, message);
      sectionErrors.push({ key: sectionDef.key, error: message });

      // Add a fallback placeholder section so the draft is still usable
      generatedSections.push({
        id: sectionDef.key,
        title: sectionDef.title,
        html: `<p class="evidence-gap">[Generation failed for this section. Error: ${message}]</p>`,
        confidence: 0.1,
        sources: [],
        evidenceStatus: "NEEDS_EVIDENCE",
        requirementsCovered: [],
        evidenceUsed: [],
        missingEvidence: [`Section "${sectionDef.key}" failed to generate.`],
        hallucinationRisk: "HIGH",
        improvementSuggestion: "Regenerate this section or write it manually.",
        approved: false,
      });
    }
  }

  return NextResponse.json({
    success: true,
    workspaceId: parsed.data.workspaceId,
    workspaceTitle,
    sections: generatedSections,
    grokStrategy,
    sectionErrors: sectionErrors.length ? sectionErrors : undefined,
  } satisfies PipelineResponse & { workspaceId: string; workspaceTitle: string; sectionErrors?: typeof sectionErrors });
}
