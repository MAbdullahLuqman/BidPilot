/**
 * Stage 2 — AI proposal generation via Claude (streaming)
 *
 * POST /api/generate-proposal
 *   Content-Type: application/json
 *   Body: GenerateProposalRequest
 *
 * Returns: text/event-stream (SSE)
 *   Each event is a StreamChunk JSON object:
 *     { delta: string }          — partial text output
 *     { done: true }             — generation finished
 *     { error: string }          — fatal error mid-stream
 *
 * The client reads the stream and appends each `delta` to build the full
 * proposal text progressively. When `done` arrives the proposal is complete.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { streamClaude } from "@/lib/ai/anthropic";
import type { GenerateProposalRequest, StreamChunk } from "@/types/proposal-pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

// ── Zod schema ──────────────────────────────────────────────────────────────

const pastProjectSchema = z.object({
  title: z.string(),
  clientName: z.string(),
  sector: z.string(),
  projectValue: z.string().optional(),
  yearCompleted: z.string().optional(),
  scopeSummary: z.string().optional(),
});

const companyDataSchema = z.object({
  companyName: z.string().min(1, "companyName is required"),
  tradingName: z.string().optional(),
  sector: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  websiteUrl: z.string().optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().optional(),
  phone: z.string().optional(),
  ntn: z.string().optional(),
  strn: z.string().optional(),
  secp: z.string().optional(),
  pecCategory: z.string().optional(),
  isoCertifications: z.string().optional(),
  otherCertifications: z.string().optional(),
  customCertificates: z.array(z.string()).optional(),
  vendorRegistrations: z.string().optional(),
  mainServices: z.string().optional(),
  secondaryServices: z.string().optional(),
  industriesServed: z.string().optional(),
  geographicCoverage: z.string().optional(),
  yearsInBusiness: z.string().optional(),
  numEmployees: z.string().optional(),
  keyExperts: z.string().optional(),
  description: z.string().optional(),
  financialDocsAvailable: z.boolean().optional(),
  bankStatementsAvailable: z.boolean().optional(),
  pastProjects: z.array(pastProjectSchema).optional(),
});

const requestSchema = z.object({
  rfpMarkdown: z.string().min(100, "rfpMarkdown must be at least 100 characters"),
  companyData: companyDataSchema,
  stream: z.boolean().optional().default(true),
  sector: z.string().optional(),
});

// ── System prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are a world-class procurement analyst and proposal writer with 20 years of experience winning government and corporate tenders in Pakistan and internationally.

Your two responsibilities in every response:

PART A — BID/NO-BID EVALUATION
Analyse the RFP against the company's profile and produce a structured evaluation:
- Eligibility verdict: ELIGIBLE / PARTIALLY ELIGIBLE / NOT ELIGIBLE
- Overall recommendation: APPLY / APPLY WITH CONDITIONS / DO NOT APPLY
- Fit score: 0–100 (weighted: mandatory compliance 40%, technical fit 30%, financial capacity 20%, experience 10%)
- Key strengths (bullet list, max 6)
- Disqualification risks (bullet list — be blunt and specific)
- Gaps that must be addressed before submission (actionable items)

PART B — FULL PROPOSAL DRAFT
Write a complete, professional bid proposal document that:
- Follows a standard Pakistani government/corporate bid structure
- Addresses every mandatory requirement extracted from the RFP
- Uses formal Pakistani business English
- Grounds every claim in verifiable company data provided — never fabricate figures, certifications, or names
- If evidence is missing, writes [EVIDENCE REQUIRED: description] rather than inventing it
- Includes all standard sections: Cover Letter, Company Profile, Scope Understanding, Technical Approach, Team & CVs placeholder, Past Projects, Compliance Matrix, Financial Proposal placeholder, Annexures list

Formatting rules:
- Use Markdown headings (#, ##, ###)
- Use tables for compliance matrices and evaluation criteria responses
- Use numbered lists for methodology steps
- Use bold for key terms and mandatory items
- Separate Part A and Part B with a clear horizontal rule (---)`;
}

// ── User message builder ────────────────────────────────────────────────────

function buildUserMessage(req: GenerateProposalRequest): string {
  const { companyData: c, rfpMarkdown, sector } = req;

  const certList = [
    c.isoCertifications,
    c.otherCertifications,
    ...(c.customCertificates ?? []),
  ]
    .filter(Boolean)
    .join(", ");

  const projectsSection =
    c.pastProjects && c.pastProjects.length > 0
      ? c.pastProjects
          .map(
            (p, i) =>
              `  ${i + 1}. "${p.title}" — Client: ${p.clientName} (${p.sector})` +
              (p.projectValue ? `, Value: ${p.projectValue}` : "") +
              (p.yearCompleted ? `, Year: ${p.yearCompleted}` : "") +
              (p.scopeSummary ? `\n     Scope: ${p.scopeSummary}` : ""),
          )
          .join("\n")
      : "  None provided.";

  const companyProfile = `
## COMPANY PROFILE
- **Legal name:** ${c.companyName}${c.tradingName ? ` (trading as: ${c.tradingName})` : ""}
- **Sector:** ${c.sector ?? sector ?? "Not specified"}
- **Location:** ${[c.city, c.country].filter(Boolean).join(", ") || "Pakistan"}
- **Website:** ${c.websiteUrl ?? "Not provided"}
- **Contact:** ${c.contactPerson ?? ""} | ${c.contactEmail ?? ""} | ${c.phone ?? ""}
- **NTN:** ${c.ntn ?? "Not provided"} | **STRN:** ${c.strn ?? "Not provided"}
- **SECP/CUIN:** ${c.secp ?? "Not provided"}
- **PEC category:** ${c.pecCategory ?? "Not provided"}
- **Certifications:** ${certList || "None listed"}
- **Vendor registrations:** ${c.vendorRegistrations ?? "None listed"}
- **Core services:** ${c.mainServices ?? "Not specified"}
- **Secondary services:** ${c.secondaryServices ?? "Not specified"}
- **Industries served:** ${c.industriesServed ?? "Not specified"}
- **Geographic coverage:** ${c.geographicCoverage ?? "Not specified"}
- **Years in business:** ${c.yearsInBusiness ?? "Not specified"}
- **Team size:** ${c.numEmployees ?? "Not specified"} employees
- **Key experts:** ${c.keyExperts ?? "Not specified"}
- **Audited financials available:** ${c.financialDocsAvailable ? "Yes" : "No / Not indicated"}
- **Bank statements available:** ${c.bankStatementsAvailable ? "Yes" : "No / Not indicated"}
- **Company description:** ${c.description ?? "Not provided"}

### Past Projects
${projectsSection}
`.trim();

  // Truncate RFP to stay within Claude's context window while keeping key sections
  // Claude Sonnet handles 200 K tokens — 150 K chars of markdown is well within budget
  const rfpSlice = rfpMarkdown.slice(0, 150_000);
  const truncationNote =
    rfpMarkdown.length > 150_000
      ? `\n\n> ⚠️ RFP was truncated from ${rfpMarkdown.length.toLocaleString()} to 150,000 characters. Review the original for any late-document requirements.`
      : "";

  return `${companyProfile}

---

## RFP / TENDER DOCUMENT (Markdown)
${rfpSlice}${truncationNote}

---

Now produce PART A (Bid/No-Bid Evaluation) followed by PART B (Full Proposal Draft) as described in your instructions.`;
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  // ── 1. API key guard ──────────────────────────────────────────────────────
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured.", code: "no_api_key" },
      { status: 503 },
    );
  }

  // ── 2. Parse + validate body ──────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body is not valid JSON.", code: "invalid_request" },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.flatten(), code: "invalid_request" },
      { status: 400 },
    );
  }

  const genRequest = parsed.data as GenerateProposalRequest;

  // ── 3. Build messages ─────────────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt();
  const userMessage = buildUserMessage(genRequest);

  // ── 4. Non-streaming path (rarely used — mostly for testing) ──────────────
  if (genRequest.stream === false) {
    const { callClaude } = await import("@/lib/ai/anthropic");
    try {
      const text = await callClaude(
        [{ role: "user", content: userMessage }],
        { system: systemPrompt, maxTokens: 8192, temperature: 0.25 },
      );
      return NextResponse.json({ proposal: text });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  // ── 5. Streaming path ─────────────────────────────────────────────────────
  try {
    const readableStream = await streamClaude(
      [{ role: "user", content: userMessage }],
      { system: systemPrompt, maxTokens: 8192, temperature: 0.25 },
    );

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable Nginx buffering if proxied
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stream initialisation failed";
    // Encode as SSE so the client's stream reader gets the error cleanly
    const encoder = new TextEncoder();
    const errorChunk: StreamChunk = { error: message };
    const body = encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`);
    return new Response(body, {
      status: 502,
      headers: { "Content-Type": "text/event-stream" },
    });
  }
}
