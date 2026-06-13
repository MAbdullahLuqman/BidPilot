# BidPilot Pakistan — Product Specification

> **From tender document to compliant proposal draft in minutes.**

## 1. What it is

BidPilot Pakistan is an AI-powered bid & proposal response engine for Pakistani companies (software houses, agencies, construction, logistics, services) that respond to RFPs, RFQs, tenders, and enterprise proposal requests.

A company signs up, adds its website (and optional documents), uploads an RFP/tender, and receives:

1. An **evidence-backed proposal draft** styled like a winning Pakistani proposal sample.
2. A **compliance checklist** mapping every RFP requirement to capability evidence.
3. A **capability match + gap analysis** showing strengths and missing items.
4. A **win-probability score** with a **GO / NO-GO** recommendation.

## 2. Who it's for

- Pakistani software houses, agencies, and consulting firms
- Construction and engineering companies
- Logistics and supply-chain firms
- Service providers responding to government and enterprise tenders

## 3. Primary flow (judges' demo)

1. Visitor lands on the marketing page.
2. Signs up → completes onboarding (company name, website, contact).
3. Clicks **Analyze Website** → capabilities extracted into the library.
4. Uploads a **professional winning proposal sample** → style/structure learned.
5. Creates a new **RFP workspace** → uploads tender document.
6. AI extracts requirements, deadlines, eligibility, eval criteria, mandatory clauses.
7. Compliance checklist appears with PASS / PARTIAL / FAIL / UNKNOWN status per requirement.
8. Capability matches and gaps surface with suggested fixes.
9. User clicks **Generate Proposal** → editable section-by-section draft is produced.
10. Win-probability dashboard shows score, decision, top strengths, top risks.
11. User exports proposal (HTML/print → optional DOCX).

## 4. Core features

### Authentication
- Firebase Auth, email/password (Google as optional polish)
- Server-side session cookie (`__session`) verified by middleware
- Logout clears the cookie and Firebase session

### Company onboarding
- Form: company name, sector, city, country, website, NTN (optional), size (optional), main services, contact person/email/phone, short description
- Persisted under `companies/{companyId}` in Firestore

### Website analysis
- Server-side fetch of the company's homepage + a same-domain allowlist: `/about`, `/services`, `/projects`, `/case-studies`, `/clients`, `/portfolio`, `/contact`
- Hard 10-second timeout, max 8 pages
- Cheerio-extracted visible text, headings, meta description
- AI extracts: overview, services, industries, past projects, certifications, technologies, client types, team strength, differentiators, capability keywords
- Manual paste fallback when scraping fails

### Capability library
- Sources: website extraction, proposal samples, uploaded case studies/certifications, manual entries
- Each record: title, type, description, source, evidence text, tags, sector, confidence score, proposal-ready paragraph

### Professional proposal sample analysis
- Upload or paste a winning proposal
- AI extracts: structure, section headings, tone, level of detail, formatting pattern, persuasive phrasing, compliance/technical/team/financial-section styles
- Used as **style guide only** — original content is generated for each new RFP. Verbatim copy is forbidden.

### RFP workspace
- One workspace per RFP/tender
- Fields: title, issuer, sector, document URL, extracted text, status, submission deadline, compliance score, win probability, GO/NO-GO, owner

### RFP parsing
- PDF (`pdf-parse`), DOCX (`mammoth`), plain text fallback
- Files stored in Firebase Storage under `rfp/{workspaceId}/source`

### AI RFP analysis
- Strict JSON output via Zod schemas, one repair-retry on parse failure
- Extracts: summary, issuer, deadline, budget, mandatory requirements, eval criteria + weights, required documents, technical/financial/eligibility requirements, compliance clauses, disqualification risks, Q&A, required sections, important dates, contacts, scope, deliverables, contract duration, location, required certifications, required past experience, required team roles

### Capability matching & compliance
- Each requirement gets: status (PASS / PARTIAL / FAIL / UNKNOWN), matched capability IDs, evidence summary, gap reason, suggested fix, suggested proposal language, confidence
- Matching combines keyword overlap, sector/cert/service/client-type matches, LLM reasoning (embeddings optional if time permits)

### Proposal generator
- Sections (rendered conditionally on the RFP): Cover Letter, Executive Summary, Understanding of Requirements, Company Profile, Relevant Experience, Technical Approach, Methodology, Work Plan, Project Timeline, Team Structure, Compliance Matrix, Risk Management, QA, Past Projects, Why Choose Us, Required Forms Checklist, Annexures Placeholder, Final Submission Checklist
- Each section shows draft, matched evidence, related requirements, confidence, edit + approve actions
- Tone/structure mirrors the uploaded sample without copying it

### Win probability & GO/NO-GO
- Weighted score (Compliance 35 / Capability 25 / Similar Experience 15 / Documents 10 / Timeline 5 / Budget 5 / Risk penalty 5)
- Decision bands: 80–100 STRONG GO, 60–79 GO WITH CAUTION, 40–59 NO-GO UNLESS GAPS FIXED, 0–39 NO-GO
- Surfaces strengths, risks, missing mandatory items, suggested next actions

### Time-saved card
- Manual estimate vs AI-assisted estimate vs reduction % (e.g., 8 h → 2.5 h → 68%)

### Export
- HTML/print (MVP) and "Copy full proposal" / "Download" buttons
- DOCX as stretch via the `docx` npm package

## 5. Routes

```
/                                  Landing
/signup                            Email signup
/login                             Email login
/dashboard                         Authed home
/onboarding                        Company onboarding form
/company-profile                   Company profile + website analysis
/capability-library                Capabilities + proposal samples
/workspaces                        Workspace list
/workspaces/new                    Create + upload RFP
/workspaces/[id]                   Workspace overview
/workspaces/[id]/analysis          RFP structured analysis
/workspaces/[id]/compliance        Compliance checklist
/workspaces/[id]/proposal          Generated proposal editor
/workspaces/[id]/win-score         Win-probability dashboard
/settings                          Account settings

/api/auth/session                  POST/DELETE session cookie
/api/auth/signup                   POST create users/{uid}
/api/company/analyze-website       POST scrape + AI extract
/api/company/analyze-proposal-sample POST style/structure analysis
/api/workspaces/create             POST new workspace
/api/rfp/extract-text              POST parse uploaded file
/api/rfp/analyze                   POST AI RFP analysis
/api/rfp/match-capabilities        POST compliance + matches
/api/proposal/generate             POST proposal sections
/api/bid/score                     POST win score + GO/NO-GO
/api/export/proposal               POST HTML / DOCX
```

## 6. Safety rules (enforced in prompts and code)

- **Do not fabricate** certifications, client names, project values, or compliance evidence.
- If evidence is missing or weak, mark **PARTIAL** or **UNKNOWN** and flag a gap.
- Mandatory requirements with no evidence become explicit risks.
- The sample proposal is **structure and style only** — never copied verbatim.
- The user can edit every generated section before export.

## 7. Out of scope (MVP)

- Multi-tenant enterprise roles, payment system, admin panel.
- Cross-domain crawling.
- Vector database (unless trivial with chosen provider).
- Pixel-perfect DOCX before the core demo lands.
- Custom ML training.

## 8. Demo target

- Seeded "Acme Tech Solutions" Pakistani company + seeded govt-IT RFP + seeded proposal sample reproduce a full proposal + compliance + GO/NO-GO in **under 3 minutes** end-to-end.
