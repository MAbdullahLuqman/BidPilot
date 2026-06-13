# AI Prompts

This document tracks the eight AI prompts used by BidPilot Pakistan. Each is paired with a Zod schema for strict JSON output. Concrete prompt bodies are added in the milestones that introduce them.

## Provider abstraction

`src/lib/ai/client.ts` exposes:

```ts
type AiProvider = 'openai' | 'anthropic' | 'gemini'

callJson<T>(opts: {
  prompt: string
  system?: string
  schema: ZodSchema<T>
  temperature?: number
  maxTokens?: number
}): Promise<T>
```

Behavior:
- Pick the driver from `AI_PROVIDER` env var (default `'openai'`).
- Force JSON-mode output where the provider supports it (`response_format: { type: 'json_object' }` for OpenAI; structured output for Anthropic; `responseMimeType: 'application/json'` for Gemini).
- On Zod parse failure, **one** repair retry that includes the previous (malformed) output and Zod errors and asks the model to return valid JSON.
- Throw a typed `AiResponseError` on second failure — never silently fall back to invented data.

## Safety rules (embedded in every system prompt)

1. **Never fabricate** certifications, client names, project values, dates, or compliance evidence.
2. Use only the evidence provided in the prompt context.
3. If evidence is missing or weak, return `"status": "UNKNOWN"` or `"PARTIAL"` and flag a `gapReason`.
4. The sample proposal is a **structure + style** reference only. Do not copy any sentence verbatim.
5. Output **strict JSON** matching the supplied schema. No prose, no markdown fences.

## Prompts

### 1. Company website capability extraction
- **Owner module**: `src/lib/ai/analyze-company.ts`
- **Input**: Cheerio-extracted HTML text from up to 8 same-domain pages
- **Output schema**: `CompanyCapabilityProfile` (services, industries, projects, certifications, technologies, client types, team strength, differentiators, capability keywords, evidence quotes)
- **Status**: stub in Milestone 1, filled in Milestone 4

### 2. Professional proposal sample analysis
- **Owner module**: `src/lib/ai/analyze-proposal-sample.ts`
- **Input**: Extracted text of the uploaded sample
- **Output schema**: `ProposalStyleAnalysis` (section structure, tone, formality, executive summary style, team-section style, compliance-response style, persuasive language list)
- **Status**: stub in Milestone 1, filled in Milestone 5

### 3. RFP requirement extraction
- **Owner module**: `src/lib/ai/extract-rfp.ts`
- **Input**: Parsed text of the RFP
- **Output schema**: `RfpAnalysis` (issuer, deadline, budget, scope, mandatory requirements, eval criteria + weights, eligibility, required docs, technical/financial/team requirements, certifications, disqualification risks, important dates, Q&A, required proposal sections, contract duration, location)
- **Status**: stub in Milestone 1, filled in Milestone 7

### 4. Capability matching
- **Owner module**: `src/lib/ai/match-capabilities.ts`
- **Input**: One requirement + the company's capability library + matched keyword candidates
- **Output schema**: `CapabilityMatch` (status PASS/PARTIAL/FAIL/UNKNOWN, matchedCapabilityIds, evidenceSummary, gapReason, confidenceScore)
- **Status**: stub in Milestone 1, filled in Milestone 8

### 5. Compliance gap analysis
- **Owner module**: `src/lib/ai/compliance-gap.ts`
- **Input**: All FAIL/UNKNOWN matches + sector context
- **Output schema**: `ComplianceGapReport` (per-row suggestedAction, suggestedProposalLanguage, priority, mitigations)
- **Status**: stub in Milestone 1, filled in Milestone 8

### 6. Proposal section generation
- **Owner module**: `src/lib/ai/generate-proposal.ts`
- **Input**: Section spec (title, related requirements, matched capabilities, sample style) + safety rules
- **Output schema**: `GeneratedSection` (title, content, relatedRequirementIds, matchedCapabilityIds, confidenceScore)
- **Status**: stub in Milestone 1, filled in Milestone 9

### 7. Win probability scoring
- **Owner module**: `src/lib/ai/score-bid.ts`
- **Input**: Aggregate compliance results + capability fit + documentation readiness + budget/timeline/sector signals
- **Output schema**: `WinScore` (per-axis scores summing to finalScore, strengths, risks)
- **Status**: stub in Milestone 1, filled in Milestone 10

### 8. GO/NO-GO reasoning
- **Owner module**: `src/lib/ai/go-no-go.ts`
- **Input**: WinScore + mandatory gaps
- **Output schema**: `GoNoGoDecision` (decision, reasoning, missingMandatoryItems, nextActions)
- **Status**: stub in Milestone 1, filled in Milestone 10

## Repair-retry template

```
The previous JSON response did not match the required schema.

ERRORS:
{zodIssues}

YOUR PREVIOUS OUTPUT:
{previousRaw}

Re-output ONLY a valid JSON object that matches the schema. No prose, no markdown fences.
```
