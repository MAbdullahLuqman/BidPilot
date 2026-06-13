// Government Proposal Template — clean A4-ready export.
// IMPORTANT: This template must NEVER contain internal data
// (win probability, NO-GO, confidence scores, hallucination risk,
// missing evidence, AI-assisted, pending review).

export interface GovernmentProposalTemplateInput {
  proposalTitle: string;
  tenderTitle?: string;
  clientName?: string;
  procuringAgency?: string;
  submittedBy: string;
  companyName: string;
  companyLogoUrl?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyWebsite?: string;
  primaryColor?: string;
  documentDate: string;
  submissionDeadline?: string;
  documentVersion?: string;
  confidentialityText?: string;
  coverHtml?: string;
  isDraft?: boolean;
  sections: Array<{
    id: string;
    title: string;
    subtitle?: string;
    html: string;
    showInToc?: boolean;
    pageBreakBefore?: boolean;
  }>;
  annexures?: Array<{
    code: string;
    title: string;
    status?: "attached" | "to_be_attached" | "not_applicable";
  }>;
}

function esc(v: string | undefined | null): string {
  if (!v) return "";
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function or(v: string | undefined | null, fallback: string): string {
  return v?.trim() ? v.trim() : fallback;
}

function annexureStatusLabel(status: string | undefined): string {
  if (status === "attached") return "Attached";
  if (status === "to_be_attached") return "To be attached";
  if (status === "not_applicable") return "Not applicable";
  return "Pending";
}

function annexureStatusClass(status: string | undefined): string {
  if (status === "attached") return "ann-attached";
  if (status === "to_be_attached") return "ann-pending";
  if (status === "not_applicable") return "ann-na";
  return "ann-pending";
}

export function renderGovernmentProposal(input: GovernmentProposalTemplateInput): string {
  const primary = input.primaryColor ?? "#0F3D5E";
  const tocSections = input.sections.filter((s) => s.showInToc !== false);

  const draftWatermarkCss = input.isDraft
    ? `
body::before {
  content: "DRAFT — INTERNAL REVIEW ONLY";
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-35deg);
  font-size: 72px;
  font-weight: 900;
  color: rgba(180, 0, 0, 0.08);
  white-space: nowrap;
  pointer-events: none;
  z-index: 9999;
  letter-spacing: 0.04em;
  user-select: none;
}
@media print {
  body::before {
    position: fixed;
    font-size: 80px;
    color: rgba(180, 0, 0, 0.07);
  }
}
`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(input.proposalTitle)}</title>
<style>
/* ─── CSS Variables ──────────────────────────────────────────────── */
:root {
  --primary:      ${primary};
  --primary-lt:   #e8eff5;
  --primary-mid:  #1a5276;
  --text:         #111827;
  --muted:        #4b5563;
  --border:       #c8d6e0;
  --slate-lt:     #f4f7fa;
  --gold:         #92400e;
  --white:        #ffffff;
}

/* ─── Reset ──────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 11pt; }
body {
  font-family: "Segoe UI", "Arial", sans-serif;
  color: var(--text);
  line-height: 1.65;
  background: #f0f4f8;
}

${draftWatermarkCss}

/* ─── Page Setup ─────────────────────────────────────────────────── */
@page {
  size: A4;
  margin: 18mm 16mm 18mm 16mm;
}
@page :first { margin: 0; }

/* ─── Print overrides ────────────────────────────────────────────── */
@media print {
  body { background: white; }
  .no-print { display: none !important; }
  .page-break { page-break-before: always; break-before: page; }
  .avoid-break { break-inside: avoid; page-break-inside: avoid; }
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
@media screen {
  body { max-width: 960px; margin: 0 auto; padding: 0; }
}

/* ─── Print toolbar ──────────────────────────────────────────────── */
.print-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 24px;
}
.print-bar h1 {
  font-size: 13px;
  font-weight: 600;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.btn-print {
  background: white;
  color: var(--primary);
  border: none;
  border-radius: 5px;
  padding: 6px 18px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.02em;
}
.btn-print:hover { background: #e2e8f0; }

/* ─── Cover Page ─────────────────────────────────────────────────── */
.cover {
  min-height: 100vh;
  background: white;
  display: grid;
  grid-template-columns: 10px 1fr;
  overflow: hidden;
  position: relative;
}
.cover-stripe {
  background: linear-gradient(180deg, var(--primary) 0%, var(--primary-mid) 100%);
}
.cover-inner {
  display: flex;
  flex-direction: column;
}
.cover-top-bar {
  background: var(--primary);
  color: white;
  padding: 14px 56px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
.cover-body {
  padding: 60px 56px 48px;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.cover-logo {
  max-height: 64px;
  max-width: 200px;
  object-fit: contain;
  margin-bottom: 36px;
}
.cover-kicker {
  display: inline-block;
  background: var(--primary-lt);
  color: var(--primary);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  padding: 4px 14px;
  border-radius: 3px;
  border-left: 3px solid var(--primary);
  margin-bottom: 24px;
}
.cover-title {
  font-size: 30px;
  font-weight: 800;
  color: var(--primary);
  line-height: 1.2;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.01em;
}
.cover-subtitle {
  font-size: 14px;
  color: var(--muted);
  margin-bottom: 44px;
  font-style: italic;
}
.cover-divider {
  width: 64px;
  height: 3px;
  background: var(--primary);
  margin-bottom: 36px;
  border-radius: 2px;
}
.cover-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
  max-width: 580px;
  margin-bottom: 44px;
}
.cover-meta-item label {
  display: block;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 4px;
}
.cover-meta-item p {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}
.cover-footer {
  margin-top: auto;
  padding-top: 28px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.cover-footer-left {
  font-size: 9px;
  color: var(--muted);
  line-height: 1.7;
}
.cover-footer-right {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--primary);
  text-align: right;
}
.cover-confidential {
  display: inline-block;
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 3px 10px;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  margin-top: 8px;
}

/* ─── Document body ──────────────────────────────────────────────── */
.doc-body {
  background: white;
  padding: 48px 56px;
}
@media print {
  .doc-body { padding: 0; }
}

/* ─── Section headings ───────────────────────────────────────────── */
.section-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 22px;
  margin-top: 48px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--border);
  break-after: avoid;
}
.section-heading:first-child { margin-top: 0; }
.section-num {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 34px;
  padding: 0 6px;
  background: var(--primary);
  color: white;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 800;
  flex-shrink: 0;
}
.section-heading h2 {
  font-size: 15px;
  font-weight: 700;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.section-subtitle {
  font-size: 11px;
  color: var(--muted);
  margin-top: -18px;
  margin-bottom: 18px;
  margin-left: 48px;
  font-style: italic;
}

/* ─── Section HTML content ───────────────────────────────────────── */
.section-html {
  font-size: 11px;
  line-height: 1.7;
  color: var(--text);
}
.section-html p { margin-bottom: 10px; }
.section-html ul, .section-html ol { margin: 8px 0 12px 22px; }
.section-html li { margin-bottom: 5px; }
.section-html h2 {
  font-size: 14px;
  font-weight: 700;
  color: var(--primary);
  margin: 18px 0 8px;
}
.section-html h3 {
  font-size: 12px;
  font-weight: 700;
  color: var(--primary);
  margin: 14px 0 6px;
}
.section-html h4 {
  font-size: 11px;
  font-weight: 700;
  color: var(--text);
  margin: 10px 0 4px;
}
.section-html table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
  margin: 14px 0;
  break-inside: auto;
}
.section-html table thead tr { background: var(--primary); color: white; }
.section-html table thead th {
  padding: 9px 10px;
  text-align: left;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.section-html table tbody tr { border-bottom: 1px solid var(--border); }
.section-html table tbody tr:nth-child(even) { background: var(--slate-lt); }
.section-html table tbody td { padding: 9px 10px; vertical-align: top; line-height: 1.5; }

/* ─── TOC ────────────────────────────────────────────────────────── */
.toc-list { list-style: none; }
.toc-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 9px 14px;
  border-radius: 5px;
  margin-bottom: 5px;
  border: 1px solid var(--border);
  background: var(--slate-lt);
  break-inside: avoid;
}
.toc-num {
  min-width: 26px;
  height: 26px;
  padding: 0 4px;
  background: var(--primary);
  color: white;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 800;
  flex-shrink: 0;
}
.toc-title { font-size: 11px; font-weight: 600; color: var(--text); }

/* ─── Annexure index ─────────────────────────────────────────────── */
.ann-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
  margin-top: 12px;
}
.ann-table thead tr { background: var(--primary); color: white; }
.ann-table thead th {
  padding: 9px 12px;
  text-align: left;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.ann-table tbody tr { border-bottom: 1px solid var(--border); }
.ann-table tbody tr:nth-child(even) { background: var(--slate-lt); }
.ann-table tbody td { padding: 9px 12px; vertical-align: middle; }
.ann-code { font-weight: 800; color: var(--primary); font-size: 10px; white-space: nowrap; }
.ann-badge {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 20px;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: 1px solid transparent;
  white-space: nowrap;
}
.ann-attached  { background: #f0fdf4; color: #16a34a; border-color: #86efac; }
.ann-pending   { background: #fffbeb; color: #b45309; border-color: #fcd34d; }
.ann-na        { background: #f8fafc; color: #64748b; border-color: #cbd5e1; }

/* ─── Page footer running (print) ────────────────────────────────── */
@media print {
  .print-page-footer {
    position: running(footer);
    font-size: 8px;
    color: var(--muted);
    border-top: 1px solid var(--border);
    padding-top: 4px;
    display: flex;
    justify-content: space-between;
  }
  @page { @bottom-center { content: element(footer); } }
}
</style>
</head>
<body>

<!-- Print toolbar (screen only) -->
<div class="print-bar no-print">
  <h1>${esc(input.proposalTitle)}</h1>
  <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
</div>

<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- COVER PAGE                                                        -->
<!-- ══════════════════════════════════════════════════════════════════ -->
<div class="cover">
  <div class="cover-stripe"></div>
  <div class="cover-inner">
    <div class="cover-top-bar">Technical Proposal — Official Submission Document</div>
    <div class="cover-body">
      ${input.companyLogoUrl ? `<img src="${esc(input.companyLogoUrl)}" alt="${esc(input.companyName)} logo" class="cover-logo" />` : ""}
      ${input.coverHtml ? input.coverHtml : `
      <span class="cover-kicker">Proposal Response — Confidential</span>
      <h1 class="cover-title">${esc(or(input.proposalTitle, "Technical Proposal"))}</h1>
      <p class="cover-subtitle">${esc(or(input.tenderTitle, "Tender Response Document"))}</p>
      <div class="cover-divider"></div>

      <div class="cover-meta-grid">
        <div class="cover-meta-item">
          <label>Submitted to</label>
          <p>${esc(or(input.procuringAgency ?? input.clientName, "Procuring Agency"))}</p>
        </div>
        <div class="cover-meta-item">
          <label>Submitted by</label>
          <p>${esc(or(input.companyName, "The Bidder"))}</p>
        </div>
        <div class="cover-meta-item">
          <label>Document date</label>
          <p>${esc(or(input.documentDate, new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" })))}</p>
        </div>
        <div class="cover-meta-item">
          <label>Submission deadline</label>
          <p>${esc(or(input.submissionDeadline, "As per tender notice"))}</p>
        </div>
        <div class="cover-meta-item">
          <label>Document version</label>
          <p>${esc(or(input.documentVersion, "v1.0"))}</p>
        </div>
        <div class="cover-meta-item">
          <label>Authorised signatory</label>
          <p>${esc(or(input.submittedBy, "Authorized Representative"))}</p>
        </div>
      </div>

      <div class="cover-footer">
        <div class="cover-footer-left">
          ${input.companyAddress ? `${esc(input.companyAddress)}<br>` : ""}
          ${input.companyEmail ? `${esc(input.companyEmail)}<br>` : ""}
          ${input.companyPhone ? `${esc(input.companyPhone)}<br>` : ""}
          ${input.companyWebsite ? `${esc(input.companyWebsite)}<br>` : ""}
          <div class="cover-confidential">${esc(or(input.confidentialityText, "Confidential — For Evaluation Purposes Only"))}</div>
        </div>
        <div class="cover-footer-right">
          ${esc(input.companyName)}<br>
          <span style="font-size:9px;font-weight:400;text-transform:none;letter-spacing:0;">${esc(or(input.documentDate, ""))}</span>
        </div>
      </div>
      `}
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- DOCUMENT BODY                                                     -->
<!-- ══════════════════════════════════════════════════════════════════ -->
<div class="doc-body">

<!-- ─── Table of Contents ──────────────────────────────────────────── -->
<div class="page-break"></div>

<div class="section-heading">
  <div class="section-num">§</div>
  <h2>Table of Contents</h2>
</div>

<ul class="toc-list">
  ${tocSections.map((sec, i) => `
  <li class="toc-item avoid-break">
    <span class="toc-num">${i + 1}</span>
    <span class="toc-title">${esc(sec.title)}${sec.subtitle ? ` — ${esc(sec.subtitle)}` : ""}</span>
  </li>`).join("")}
  ${input.annexures?.length ? `
  <li class="toc-item avoid-break">
    <span class="toc-num">Ann</span>
    <span class="toc-title">Annexure Index</span>
  </li>` : ""}
</ul>

<!-- ─── Proposal Sections ─────────────────────────────────────────── -->
${input.sections.map((sec, i) => {
  const tocIndex = tocSections.findIndex((t) => t.id === sec.id);
  const displayNum = tocIndex >= 0 ? String(tocIndex + 1) : String(i + 1);
  return `
${sec.pageBreakBefore !== false ? `<div class="page-break"></div>` : ""}

<div class="section-heading avoid-break">
  <div class="section-num">${esc(displayNum)}</div>
  <h2>${esc(sec.title)}</h2>
</div>
${sec.subtitle ? `<p class="section-subtitle">${esc(sec.subtitle)}</p>` : ""}

<div class="section-html">${sec.html || `<p style="color:var(--muted);font-style:italic;">Content not available.</p>`}</div>
`;
}).join("")}

<!-- ─── Annexure Index ─────────────────────────────────────────────── -->
${input.annexures?.length ? `
<div class="page-break"></div>

<div class="section-heading">
  <div class="section-num">Ann</div>
  <h2>Annexure Index</h2>
</div>

<table class="ann-table">
  <thead>
    <tr>
      <th style="width:12%">Code</th>
      <th style="width:60%">Document Title</th>
      <th style="width:28%">Status</th>
    </tr>
  </thead>
  <tbody>
    ${input.annexures.map((ann) => `
    <tr class="avoid-break">
      <td class="ann-code">${esc(ann.code)}</td>
      <td>${esc(ann.title)}</td>
      <td><span class="ann-badge ${annexureStatusClass(ann.status)}">${annexureStatusLabel(ann.status)}</span></td>
    </tr>`).join("")}
  </tbody>
</table>
` : ""}

</div><!-- /doc-body -->
</body>
</html>`;
}
