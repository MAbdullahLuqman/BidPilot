// Premium proposal HTML renderer — standalone, print-safe, A4-ready.
// renderPremiumProposalHtml is the INTERNAL view (includes win score, compliance matrix, risk register).
// renderProposalSectionsOnly is the clean export (sections only, no internal data).

export type ProposalSection = {
  id: string;
  title: string;
  html: string;
  confidence: number;
  evidenceStatus: "READY" | "NEEDS_EVIDENCE" | "REVIEW";
  requirementsCovered?: string[];
  evidenceUsed?: string[];
  missingEvidence?: string[];
  hallucinationRisk?: "LOW" | "MEDIUM" | "HIGH";
  improvementSuggestion?: string;
  approved?: boolean;
};

export type ProposalRequirement = {
  id: string;
  requirement: string;
  mandatory: boolean;
  status: "PASS" | "PARTIAL" | "FAIL" | "UNKNOWN";
  evidence: string;
  action: string;
  confidence: number;
};

export type ProposalCompany = {
  companyName: string;
  logoUrl?: string;
  sector?: string;
  city?: string;
  country?: string;
  contactPerson?: string;
  contactEmail?: string;
  phone?: string;
  ntn?: string;
  mainServices?: string;
  description?: string;
};

export type ProposalMeta = {
  title: string;
  issuer?: string;
  deadline?: string;
  version?: string;
  preparedDate?: string;
  sector?: string;
  winScore?: number;
  goNoGo?: string;
};

export type PremiumProposalData = {
  meta: ProposalMeta;
  company: ProposalCompany;
  sections: ProposalSection[];
  requirements: ProposalRequirement[];
};

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

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    PASS: "badge-pass",
    PARTIAL: "badge-partial",
    FAIL: "badge-fail",
    UNKNOWN: "badge-unknown",
  };
  return `<span class="badge ${map[status] ?? "badge-unknown"}">${esc(status)}</span>`;
}

function riskBadge(risk: string): string {
  const map: Record<string, string> = {
    HIGH: "badge-fail",
    MEDIUM: "badge-partial",
    LOW: "badge-pass",
  };
  return `<span class="badge ${map[risk] ?? "badge-unknown"}">${esc(risk)}</span>`;
}

function confidenceBar(score: number): string {
  const pct = Math.round(score * 100);
  const cls = pct >= 80 ? "bar-pass" : pct >= 60 ? "bar-partial" : "bar-fail";
  return `<div class="conf-bar-wrap"><div class="conf-bar ${cls}" style="width:${pct}%"></div></div><span class="conf-label">${pct}%</span>`;
}

function scoreCircle(score: number, label: string): string {
  const cls = score >= 80 ? "score-pass" : score >= 60 ? "score-partial" : "score-fail";
  return `<div class="score-circle ${cls}">${score}<span class="score-unit">%</span></div><p class="score-label">${esc(label)}</p>`;
}

function snapshotCard(label: string, value: string, sub?: string, accent?: string): string {
  const cls = accent ? `snap-card snap-card--${accent}` : "snap-card";
  return `<div class="${cls}"><p class="snap-label">${esc(label)}</p><p class="snap-value">${value}</p>${sub ? `<p class="snap-sub">${esc(sub)}</p>` : ""}</div>`;
}

export function renderPremiumProposalHtml(data: PremiumProposalData): string {
  const { meta, company, sections, requirements } = data;

  const passCount = requirements.filter((r) => r.status === "PASS").length;
  const partialCount = requirements.filter((r) => r.status === "PARTIAL").length;
  const failCount = requirements.filter((r) => r.status === "FAIL").length;
  const unknownCount = requirements.filter((r) => r.status === "UNKNOWN").length;
  const mandatoryCount = requirements.filter((r) => r.mandatory).length;
  const missingCount = requirements.filter((r) => r.status === "FAIL" || r.status === "UNKNOWN").length;
  const complianceScore = requirements.length
    ? Math.round((passCount / requirements.length) * 100)
    : 0;
  const winScore = meta.winScore ?? Math.min(95, complianceScore + Math.round(partialCount * 10 / Math.max(requirements.length, 1)));
  const goNoGo = meta.goNoGo ?? (winScore >= 80 ? "STRONG GO" : winScore >= 60 ? "GO WITH CAUTION" : winScore >= 40 ? "NO-GO UNLESS GAPS FIXED" : "NO-GO");

  const disqRisks = requirements.filter((r) => r.mandatory && (r.status === "FAIL" || r.status === "UNKNOWN"));

  const allMissingEvidence: string[] = [];
  for (const s of sections) {
    if (s.missingEvidence?.length) allMissingEvidence.push(...s.missingEvidence);
  }

  const tocEntries = sections.map((s, i) => `${i + 1}. ${s.title}`);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.title)} — Technical Proposal</title>
<style>
/* ─── CSS Variables ──────────────────────────────────────────────── */
:root {
  --navy:      #1a2f4e;
  --navy-mid:  #23406b;
  --navy-lt:   #e8eef7;
  --slate:     #334155;
  --slate-lt:  #f1f5f9;
  --border:    #cbd5e1;
  --text:      #111827;
  --muted:     #4b5563;
  --pass:      #16a34a;
  --pass-bg:   #f0fdf4;
  --pass-bd:   #86efac;
  --partial:   #b45309;
  --partial-bg:#fffbeb;
  --partial-bd:#fcd34d;
  --fail:      #b91c1c;
  --fail-bg:   #fef2f2;
  --fail-bd:   #fca5a5;
  --unknown:   #1d4ed8;
  --unknown-bg:#eff6ff;
  --unknown-bd:#93c5fd;
  --accent:    #2563eb;
  --gold:      #92400e;
}

/* ─── Reset & Base ───────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 11pt; }
body {
  font-family: "Segoe UI", Arial, sans-serif;
  color: var(--text);
  line-height: 1.6;
  background: #f8fafc;
}

/* ─── Page Setup ─────────────────────────────────────────────────── */
@page {
  size: A4;
  margin: 16mm 14mm;
}
@page :first { margin: 0; }

/* ─── Print overrides ────────────────────────────────────────────── */
@media print {
  body { background: white; }
  .no-print { display: none !important; }
  .page-break { page-break-before: always; }
  .avoid-break { break-inside: avoid; page-break-inside: avoid; }
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
@media screen {
  body { max-width: 900px; margin: 0 auto; padding: 0; }
}

/* ─── Print button ───────────────────────────────────────────────── */
.print-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--navy);
  color: white;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
}
.print-bar h1 { font-size: 13px; font-weight: 600; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.btn-print {
  background: white;
  color: var(--navy);
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
  display: grid;
  grid-template-columns: 8px 1fr;
  background: white;
  position: relative;
  overflow: hidden;
}
.cover-stripe {
  background: linear-gradient(180deg, var(--navy) 0%, #2563eb 100%);
}
.cover-body {
  padding: 60px 56px 48px;
  display: flex;
  flex-direction: column;
}
.cover-top-bar {
  background: var(--navy);
  color: white;
  padding: 14px 56px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin: 0 0 0 8px;
}
.cover-kicker {
  display: inline-block;
  background: var(--navy-lt);
  color: var(--navy);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  padding: 4px 14px;
  border-radius: 3px;
  border-left: 3px solid var(--accent);
  margin-bottom: 28px;
}
.cover-title {
  font-size: 28px;
  font-weight: 800;
  color: var(--navy);
  line-height: 1.25;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.01em;
}
.cover-subtitle {
  font-size: 14px;
  color: var(--muted);
  margin-bottom: 48px;
  font-style: italic;
}
.cover-divider {
  width: 56px;
  height: 3px;
  background: var(--accent);
  margin-bottom: 36px;
  border-radius: 2px;
}
.cover-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  max-width: 560px;
  margin-bottom: 40px;
}
.cover-meta-item label {
  display: block;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 3px;
}
.cover-meta-item p {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}
.cover-footer {
  margin-top: auto;
  padding-top: 32px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cover-footer-left { font-size: 9px; color: var(--muted); line-height: 1.6; }
.cover-footer-right {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
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
  margin-top: 6px;
}

/* ─── Document body wrapper ──────────────────────────────────────── */
.doc-body {
  background: white;
  padding: 40px 56px;
}
@media print {
  .doc-body { padding: 0; }
}

/* ─── Section headings ───────────────────────────────────────────── */
.section-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
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
  width: 32px;
  height: 32px;
  background: var(--navy);
  color: white;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 800;
  flex-shrink: 0;
}
.section-heading h2 {
  font-size: 15px;
  font-weight: 700;
  color: var(--navy);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ─── Snapshot / Executive Summary cards ────────────────────────── */
.snap-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 32px;
}
.snap-card {
  background: var(--slate-lt);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  break-inside: avoid;
}
.snap-card--pass   { border-left: 4px solid var(--pass); background: var(--pass-bg); }
.snap-card--fail   { border-left: 4px solid var(--fail); background: var(--fail-bg); }
.snap-card--partial { border-left: 4px solid var(--partial); background: var(--partial-bg); }
.snap-card--accent { border-left: 4px solid var(--accent); background: var(--navy-lt); }
.snap-label {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 6px;
}
.snap-value {
  font-size: 20px;
  font-weight: 800;
  color: var(--navy);
  line-height: 1.1;
}
.snap-sub { font-size: 9px; color: var(--muted); margin-top: 4px; }

/* ─── Score circle ───────────────────────────────────────────────── */
.score-row { display: flex; gap: 28px; align-items: center; margin-bottom: 28px; flex-wrap: wrap; }
.score-circle {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 800;
  flex-direction: row;
  border: 4px solid;
  flex-shrink: 0;
}
.score-circle.score-pass   { border-color: var(--pass); color: var(--pass); }
.score-circle.score-partial { border-color: var(--partial); color: var(--partial); }
.score-circle.score-fail   { border-color: var(--fail); color: var(--fail); }
.score-unit { font-size: 11px; font-weight: 600; margin-left: 1px; align-self: flex-start; margin-top: 8px; }
.score-label { font-size: 9px; color: var(--muted); text-align: center; margin-top: 5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; }
.score-block { text-align: center; }

/* ─── Confidence bar ─────────────────────────────────────────────── */
.conf-bar-wrap {
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
  display: inline-block;
  width: 80px;
  vertical-align: middle;
  margin-right: 6px;
}
.conf-bar { height: 100%; border-radius: 3px; }
.conf-bar.bar-pass    { background: var(--pass); }
.conf-bar.bar-partial { background: var(--partial); }
.conf-bar.bar-fail    { background: var(--fail); }
.conf-label { font-size: 10px; font-weight: 600; vertical-align: middle; }

/* ─── Badges ─────────────────────────────────────────────────────── */
.badge {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 20px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid transparent;
  white-space: nowrap;
}
.badge-pass    { background: var(--pass-bg);    color: var(--pass);    border-color: var(--pass-bd); }
.badge-partial { background: var(--partial-bg); color: var(--partial); border-color: var(--partial-bd); }
.badge-fail    { background: var(--fail-bg);    color: var(--fail);    border-color: var(--fail-bd); }
.badge-unknown { background: var(--unknown-bg); color: var(--unknown); border-color: var(--unknown-bd); }
.badge-mand    { background: var(--navy-lt);    color: var(--navy);    border-color: var(--navy-mid); font-size: 8px; }
.badge-opt     { background: #f8fafc;           color: var(--muted);   border-color: var(--border); font-size: 8px; }

/* ─── Tables ─────────────────────────────────────────────────────── */
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
  margin: 16px 0;
  break-inside: auto;
}
thead tr { background: var(--navy); color: white; }
thead th {
  padding: 9px 10px;
  text-align: left;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
tbody tr { border-bottom: 1px solid var(--border); }
tbody tr:nth-child(even) { background: var(--slate-lt); }
tbody td {
  padding: 9px 10px;
  vertical-align: top;
  line-height: 1.5;
}
.td-id { font-weight: 700; font-size: 9px; color: var(--navy); white-space: nowrap; }
.td-evidence { color: var(--muted); font-style: italic; }
.td-action { font-weight: 600; }

/* ─── Callout / info boxes ───────────────────────────────────────── */
.callout {
  border-radius: 6px;
  padding: 14px 18px;
  margin: 16px 0;
  break-inside: avoid;
}
.callout-warn {
  background: var(--fail-bg);
  border-left: 4px solid var(--fail);
}
.callout-info {
  background: var(--navy-lt);
  border-left: 4px solid var(--accent);
}
.callout-success {
  background: var(--pass-bg);
  border-left: 4px solid var(--pass);
}
.callout-amber {
  background: var(--partial-bg);
  border-left: 4px solid var(--partial);
}
.callout-title {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  margin-bottom: 6px;
}
.callout-warn .callout-title   { color: var(--fail); }
.callout-info .callout-title   { color: var(--accent); }
.callout-success .callout-title { color: var(--pass); }
.callout-amber .callout-title   { color: var(--partial); }
.callout p { font-size: 10px; line-height: 1.6; }
.callout ul { margin-left: 16px; font-size: 10px; line-height: 1.8; }

/* ─── TOC ────────────────────────────────────────────────────────── */
.toc-list { list-style: none; }
.toc-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 9px 14px;
  border-radius: 5px;
  margin-bottom: 4px;
  border: 1px solid var(--border);
  background: var(--slate-lt);
  break-inside: avoid;
}
.toc-num {
  width: 22px;
  height: 22px;
  background: var(--navy);
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

/* ─── Methodology cards ──────────────────────────────────────────── */
.method-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
.method-card {
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 14px 16px;
  background: white;
  break-inside: avoid;
  position: relative;
}
.method-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  background: var(--navy);
  border-radius: 7px 0 0 7px;
}
.method-stage {
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 4px;
}
.method-title { font-size: 11px; font-weight: 700; color: var(--navy); margin-bottom: 6px; }
.method-activity { font-size: 10px; color: var(--muted); margin-bottom: 6px; line-height: 1.5; }
.method-output {
  font-size: 9px;
  font-weight: 700;
  color: var(--pass);
  background: var(--pass-bg);
  border: 1px solid var(--pass-bd);
  border-radius: 3px;
  padding: 2px 8px;
  display: inline-block;
}

/* ─── Timeline ───────────────────────────────────────────────────── */
.timeline { position: relative; padding-left: 28px; margin: 16px 0; }
.timeline::before {
  content: '';
  position: absolute;
  left: 10px; top: 0; bottom: 0;
  width: 2px;
  background: var(--border);
}
.timeline-item {
  position: relative;
  margin-bottom: 18px;
  break-inside: avoid;
}
.timeline-dot {
  position: absolute;
  left: -22px;
  top: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--navy);
  border: 2px solid white;
  box-shadow: 0 0 0 2px var(--navy);
}
.timeline-card {
  background: var(--slate-lt);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px 16px;
}
.timeline-phase {
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--accent);
  margin-bottom: 3px;
}
.timeline-title { font-size: 11px; font-weight: 700; color: var(--navy); margin-bottom: 6px; }
.timeline-row { display: flex; gap: 12px; flex-wrap: wrap; }
.timeline-col { flex: 1; min-width: 120px; }
.timeline-col-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 2px; }
.timeline-col-val { font-size: 10px; color: var(--text); }

/* ─── Risk cards ─────────────────────────────────────────────────── */
.risk-table-wrap { overflow-x: auto; }

/* ─── Section content ────────────────────────────────────────────── */
.section-html { font-size: 11px; line-height: 1.7; color: var(--text); }
.section-html p { margin-bottom: 10px; }
.section-html ul, .section-html ol { margin: 8px 0 12px 20px; }
.section-html li { margin-bottom: 4px; }
.section-html h3 { font-size: 12px; font-weight: 700; color: var(--navy); margin: 14px 0 6px; }
.section-html table { font-size: 10px; }
.section-html table th { font-size: 9px; }
.evidence-meta { margin-top: 14px; }
.evidence-chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 5px; }
.evidence-chip {
  font-size: 9px;
  padding: 2px 9px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--slate-lt);
  color: var(--muted);
}
.evidence-chip.chip-missing {
  background: var(--partial-bg);
  border-color: var(--partial-bd);
  color: var(--partial);
}

/* ─── Submission checklist ───────────────────────────────────────── */
.checklist { list-style: none; }
.checklist li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid var(--border);
  font-size: 10px;
  break-inside: avoid;
}
.checklist-box {
  width: 14px;
  height: 14px;
  border: 1.5px solid var(--border);
  border-radius: 3px;
  flex-shrink: 0;
  margin-top: 1px;
  background: white;
}
.checklist-text { flex: 1; line-height: 1.5; }
.checklist-req { font-size: 8px; color: var(--muted); margin-top: 2px; }

/* ─── Page header / footer (print only) ─────────────────────────── */
@media print {
  .print-header {
    position: running(header);
    font-size: 8px;
    color: var(--muted);
    border-bottom: 1px solid var(--border);
    padding-bottom: 4px;
    display: flex;
    justify-content: space-between;
  }
}
</style>
</head>
<body>

<!-- Print toolbar -->
<div class="print-bar no-print">
  <h1>${esc(meta.title)} — Technical Proposal</h1>
  <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
</div>

<!-- ═══════════════════════════════════════════════════════════════ -->
<!-- COVER PAGE                                                      -->
<!-- ═══════════════════════════════════════════════════════════════ -->
<div class="cover">
  <div class="cover-stripe"></div>
  <div style="display:flex; flex-direction:column;">
    <div class="cover-top-bar">Technical Proposal — Confidential Response Document</div>
    <div class="cover-body">
      ${company.logoUrl ? `<img src="${esc(company.logoUrl)}" alt="${esc(company.companyName)} logo" style="max-height:56px;max-width:180px;object-fit:contain;margin-bottom:20px;" />` : ""}
      <span class="cover-kicker">BidPilot Pakistan · Proposal Response</span>
      <h1 class="cover-title">${esc(or(meta.title, "Technical Proposal"))}</h1>
      <p class="cover-subtitle">${esc(or(meta.sector, "Professional Services"))} · Procurement Response</p>
      <div class="cover-divider"></div>

      <div class="cover-meta-grid">
        <div class="cover-meta-item">
          <label>Submitted to</label>
          <p>${esc(or(meta.issuer, "Procuring Agency"))}</p>
        </div>
        <div class="cover-meta-item">
          <label>Submitted by</label>
          <p>${esc(or(company.companyName, "Bidding Company"))}</p>
        </div>
        <div class="cover-meta-item">
          <label>Company location</label>
          <p>${esc([company.city, company.country].filter(Boolean).join(", ") || "Pakistan")}</p>
        </div>
        <div class="cover-meta-item">
          <label>Sector / Type</label>
          <p>${esc(or(meta.sector ?? company.sector, "General Services"))}</p>
        </div>
        <div class="cover-meta-item">
          <label>Submission deadline</label>
          <p>${esc(or(meta.deadline, "Date not available"))}</p>
        </div>
        <div class="cover-meta-item">
          <label>Document date</label>
          <p>${esc(or(meta.preparedDate, new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" })))}</p>
        </div>
        <div class="cover-meta-item">
          <label>Document version</label>
          <p>${esc(or(meta.version, "v1.0 — Draft"))}</p>
        </div>
        <div class="cover-meta-item">
          <label>Contact person</label>
          <p>${esc(or(company.contactPerson, "Not provided"))}</p>
        </div>
      </div>

      <div class="cover-footer">
        <div class="cover-footer-left">
          ${company.contactEmail ? `${esc(company.contactEmail)}<br>` : ""}
          ${company.phone ? `${esc(company.phone)}<br>` : ""}
          ${company.ntn ? `NTN: ${esc(company.ntn)}` : "NTN: Not uploaded"}
          <div class="cover-confidential">Confidential — For Evaluation Purposes Only</div>
        </div>
        <div class="cover-footer-right">
          Prepared with BidPilot Pakistan<br>
          <span style="font-size:9px; font-weight:400; text-transform:none; letter-spacing:0;">AI-Assisted Proposal Engine</span>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════ -->
<!-- DOCUMENT BODY                                                   -->
<!-- ═══════════════════════════════════════════════════════════════ -->
<div class="doc-body">

<!-- ─── Executive Proposal Snapshot ──────────────────────────────── -->
<div class="page-break"></div>

<div class="section-heading">
  <div class="section-num">★</div>
  <h2>Executive Proposal Snapshot</h2>
</div>

<div class="snap-grid">
  ${snapshotCard("Tender issuer", esc(or(meta.issuer, "Not specified")))}
  ${snapshotCard("Submission deadline", esc(or(meta.deadline, "Not available")), "Verify before submission")}
  ${snapshotCard("Total requirements", String(requirements.length), `${mandatoryCount} mandatory`)}
  ${snapshotCard("Requirements passed", String(passCount), `${Math.round((passCount / Math.max(requirements.length, 1)) * 100)}% of total`, "pass")}
  ${snapshotCard("Missing / at risk", String(missingCount), "FAIL or UNKNOWN items", missingCount > 0 ? "fail" : "pass")}
  ${snapshotCard("Win probability", `${winScore}%`, goNoGo, winScore >= 70 ? "pass" : winScore >= 50 ? "partial" : "fail")}
</div>

<div class="score-row">
  <div class="score-block">${scoreCircle(complianceScore, "Compliance Score")}</div>
  <div class="score-block">${scoreCircle(winScore, "Win Probability")}</div>
  <div style="flex:1;">
    <div style="background:var(--navy-lt); border:1px solid var(--border); border-radius:8px; padding:16px; break-inside:avoid;">
      <p style="font-size:8px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:var(--muted); margin-bottom:8px;">GO / NO-GO Decision</p>
      <p style="font-size:18px; font-weight:800; color:${winScore >= 70 ? "var(--pass)" : winScore >= 50 ? "var(--partial)" : "var(--fail)"};">${esc(goNoGo)}</p>
      <p style="font-size:10px; color:var(--muted); margin-top:6px;">Based on requirement matching and evidence available at time of export.</p>
    </div>
  </div>
</div>

${disqRisks.length > 0 ? `
<div class="callout callout-warn avoid-break">
  <p class="callout-title">⚠ Disqualification Risk Detected</p>
  <p>The following mandatory requirements have no verified evidence. These items may disqualify the bid if not resolved before submission.</p>
  <ul>
    ${disqRisks.map((r) => `<li><strong>${esc(r.id)}</strong>: ${esc(r.requirement)} — <em>${esc(r.action)}</em></li>`).join("")}
  </ul>
</div>
` : ""}

${allMissingEvidence.length > 0 ? `
<div class="callout callout-amber avoid-break">
  <p class="callout-title">Missing Evidence Summary</p>
  <ul>
    ${[...new Set(allMissingEvidence)].slice(0, 10).map((e) => `<li>${esc(e)}</li>`).join("")}
  </ul>
</div>
` : ""}

<!-- ─── Table of Contents ─────────────────────────────────────────── -->
<div class="section-heading">
  <div class="section-num">§</div>
  <h2>Table of Contents</h2>
</div>

<ul class="toc-list">
  ${tocEntries.map((entry, i) => `
  <li class="toc-item">
    <span class="toc-num">${i + 1}</span>
    <span class="toc-title">${esc(entry)}</span>
  </li>`).join("")}
  <li class="toc-item">
    <span class="toc-num">A</span>
    <span class="toc-title">Compliance Matrix</span>
  </li>
  <li class="toc-item">
    <span class="toc-num">B</span>
    <span class="toc-title">Risk and Evidence Register</span>
  </li>
  <li class="toc-item">
    <span class="toc-num">C</span>
    <span class="toc-title">Submission Readiness Checklist</span>
  </li>
</ul>

<!-- ─── Proposal Sections ─────────────────────────────────────────── -->
${sections.map((sec, i) => `
<div class="page-break"></div>

<div class="section-heading avoid-break">
  <div class="section-num">${i + 1}</div>
  <h2>${esc(sec.title)}</h2>
</div>

${sec.title.toLowerCase().includes("methodology") || sec.title.toLowerCase().includes("approach") ? renderMethodologyCards() : ""}

${sec.title.toLowerCase().includes("work plan") || sec.title.toLowerCase().includes("timeline") ? renderTimeline() : ""}

<div class="section-html">${sec.html || `<p style="color:var(--muted); font-style:italic;">Content not generated. Use the Proposal Studio to generate this section.</p>`}</div>

${(sec.evidenceUsed?.length || sec.missingEvidence?.length) ? `
<div class="evidence-meta avoid-break" style="margin-top:12px; border-top:1px solid var(--border); padding-top:10px;">
  ${sec.requirementsCovered?.length ? `
    <p style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); margin-bottom:4px;">Requirements covered</p>
    <div class="evidence-chip-row">${sec.requirementsCovered.map((r) => `<span class="evidence-chip">${esc(r)}</span>`).join("")}</div>
  ` : ""}
  ${sec.evidenceUsed?.length ? `
    <p style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); margin-bottom:4px; margin-top:8px;">Evidence used</p>
    <div class="evidence-chip-row">${sec.evidenceUsed.map((e) => `<span class="evidence-chip">${esc(e)}</span>`).join("")}</div>
  ` : ""}
  ${sec.missingEvidence?.length ? `
    <p style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--partial); margin-bottom:4px; margin-top:8px;">Missing evidence</p>
    <div class="evidence-chip-row">${sec.missingEvidence.map((e) => `<span class="evidence-chip chip-missing">${esc(e)}</span>`).join("")}</div>
  ` : ""}
</div>
` : ""}

<div style="display:flex; align-items:center; gap:12px; margin-top:10px; padding:8px 0; border-top:1px solid var(--border); font-size:9px; color:var(--muted);">
  <span>Confidence: ${confidenceBar(sec.confidence)}</span>
  ${sec.hallucinationRisk ? `<span>Risk: ${riskBadge(sec.hallucinationRisk)}</span>` : ""}
  ${sec.approved ? `<span class="badge badge-pass">✓ Approved</span>` : `<span class="badge badge-unknown">Pending review</span>`}
</div>
`).join("")}

<!-- ─── Compliance Matrix ─────────────────────────────────────────── -->
<div class="page-break"></div>

<div class="section-heading">
  <div class="section-num">A</div>
  <h2>Compliance Matrix</h2>
</div>

${requirements.length === 0 ? `<div class="callout callout-info"><p>No requirements extracted. Paste RFP text and use AI analysis to generate the compliance matrix.</p></div>` : `
<table>
  <thead>
    <tr>
      <th style="width:8%">ID</th>
      <th style="width:28%">Requirement</th>
      <th style="width:9%">Type</th>
      <th style="width:10%">Status</th>
      <th style="width:25%">Evidence summary</th>
      <th style="width:20%">Action required</th>
    </tr>
  </thead>
  <tbody>
    ${requirements.map((r) => `
    <tr class="avoid-break">
      <td class="td-id">${esc(r.id)}</td>
      <td>${esc(r.requirement)}</td>
      <td>${r.mandatory ? `<span class="badge badge-mand">Mandatory</span>` : `<span class="badge badge-opt">Optional</span>`}</td>
      <td>${statusBadge(r.status)}</td>
      <td class="td-evidence">${esc(r.evidence || "No evidence mapped")}</td>
      <td class="td-action">${esc(r.action || "—")}</td>
    </tr>`).join("")}
  </tbody>
</table>

<div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;">
  ${[["PASS", passCount, "badge-pass"], ["PARTIAL", partialCount, "badge-partial"], ["FAIL", failCount, "badge-fail"], ["UNKNOWN", unknownCount, "badge-unknown"]].map(([label, count, cls]) => `
  <div style="padding:8px 14px; border-radius:6px; border:1px solid var(--border); background:var(--slate-lt); font-size:10px; break-inside:avoid;">
    <span class="badge ${cls}">${esc(String(label))}</span>
    <span style="margin-left:8px; font-weight:700;">${count}</span>
    <span style="color:var(--muted)"> / ${requirements.length}</span>
  </div>`).join("")}
</div>
`}

<!-- ─── Risk and Evidence Register ───────────────────────────────── -->
<div class="page-break"></div>

<div class="section-heading">
  <div class="section-num">B</div>
  <h2>Risk and Evidence Register</h2>
</div>

${requirements.filter((r) => r.status !== "PASS").length === 0 ? `<div class="callout callout-success"><p class="callout-title">No open risks</p><p>All extracted requirements show PASS status. Confirm evidence is attached to annexures before final submission.</p></div>` : `
<table>
  <thead>
    <tr>
      <th style="width:9%">Req ID</th>
      <th style="width:10%">Severity</th>
      <th style="width:28%">Requirement</th>
      <th style="width:25%">Why it matters / Gap</th>
      <th style="width:28%">Action</th>
    </tr>
  </thead>
  <tbody>
    ${requirements.filter((r) => r.status !== "PASS").map((r) => {
      const severity = r.mandatory && r.status === "FAIL" ? "HIGH" : r.mandatory && r.status === "UNKNOWN" ? "HIGH" : r.status === "PARTIAL" ? "MEDIUM" : "LOW";
      return `
    <tr class="avoid-break">
      <td class="td-id">${esc(r.id)}</td>
      <td>${riskBadge(severity)}</td>
      <td>${esc(r.requirement)}</td>
      <td class="td-evidence">${esc(r.evidence || "No evidence uploaded")}</td>
      <td class="td-action">${esc(r.action || "Review before submission")}</td>
    </tr>`;}).join("")}
  </tbody>
</table>
`}

<!-- ─── Submission Readiness Checklist ───────────────────────────── -->
<div class="page-break"></div>

<div class="section-heading">
  <div class="section-num">C</div>
  <h2>Submission Readiness Checklist</h2>
</div>

<ul class="checklist">
  ${buildChecklistItems(requirements, company).map((item) => `
  <li class="avoid-break">
    <div class="checklist-box"></div>
    <div class="checklist-text">
      <strong>${esc(item.label)}</strong>
      <p class="checklist-req">${esc(item.note)}</p>
    </div>
    ${statusBadge(item.status)}
  </li>`).join("")}
</ul>

</div><!-- /doc-body -->
</body>
</html>`;
}

// ─── Methodology section visual ──────────────────────────────────────────────
function renderMethodologyCards(): string {
  const stages = [
    { num: "01", title: "Mobilization", activity: "Team assignment, data request register, kick-off meeting, schedule confirmation.", output: "Inception note" },
    { num: "02", title: "Document Review", activity: "Review of RFP documents, site data, previous studies, clarification items.", output: "Data register" },
    { num: "03", title: "Technical Analysis", activity: "Requirement breakdown, evidence mapping, technical workstreams, design basis.", output: "Compliance register" },
    { num: "04", title: "Proposal Development", activity: "Draft sections per RFP structure, apply company evidence, mark gaps clearly.", output: "Draft proposal" },
    { num: "05", title: "Compliance Review", activity: "Cross-check each requirement, validate mandatory items, flag missing documents.", output: "Compliance matrix" },
    { num: "06", title: "Final QA & Submission", activity: "Formatting, annexures checklist, peer review, version control, submission package.", output: "Final submission" },
  ];
  return `<div class="method-grid">
    ${stages.map((s) => `
    <div class="method-card avoid-break">
      <p class="method-stage">Stage ${s.num}</p>
      <p class="method-title">${s.title}</p>
      <p class="method-activity">${s.activity}</p>
      <span class="method-output">▸ ${s.output}</span>
    </div>`).join("")}
  </div>`;
}

// ─── Timeline visual ──────────────────────────────────────────────────────────
function renderTimeline(): string {
  const phases = [
    { phase: "Phase 1", title: "Mobilization & Setup", activities: "Team onboarding, data request, schedule baseline.", output: "Inception report" },
    { phase: "Phase 2", title: "Analysis & Requirements", activities: "Requirement mapping, evidence alignment, gap identification.", output: "Analysis register" },
    { phase: "Phase 3", title: "Technical Proposal", activities: "Section-by-section drafting, evidence linking, compliance matrix.", output: "Draft proposal" },
    { phase: "Phase 4", title: "Review & QA", activities: "Internal review, hallucination check, evidence verification.", output: "Reviewed draft" },
    { phase: "Phase 5", title: "Final Submission", activities: "Annexures, formatting, final checklist, client submission.", output: "Submission package" },
  ];
  return `<div class="timeline">
    ${phases.map((p) => `
    <div class="timeline-item avoid-break">
      <div class="timeline-dot"></div>
      <div class="timeline-card">
        <p class="timeline-phase">${p.phase}</p>
        <p class="timeline-title">${p.title}</p>
        <div class="timeline-row">
          <div class="timeline-col">
            <p class="timeline-col-label">Activities</p>
            <p class="timeline-col-val">${p.activities}</p>
          </div>
          <div class="timeline-col">
            <p class="timeline-col-label">Output</p>
            <p class="timeline-col-val">${p.output}</p>
          </div>
        </div>
      </div>
    </div>`).join("")}
  </div>`;
}

// ─── Submission checklist items ───────────────────────────────────────────────
function buildChecklistItems(
  requirements: ProposalRequirement[],
  company: ProposalCompany,
): { label: string; note: string; status: "PASS" | "PARTIAL" | "FAIL" | "UNKNOWN" }[] {
  const items: { label: string; note: string; status: "PASS" | "PARTIAL" | "FAIL" | "UNKNOWN" }[] = [
    {
      label: "Technical Proposal",
      note: "Complete section-by-section technical proposal in required format.",
      status: "PARTIAL",
    },
    {
      label: "Company Registration / SECP Certificate",
      note: "Upload valid SECP or equivalent registration certificate.",
      status: company.ntn ? "PARTIAL" : "UNKNOWN",
    },
    {
      label: "NTN Certificate (Tax Registration)",
      note: "National Tax Number certificate from FBR.",
      status: company.ntn ? "PASS" : "UNKNOWN",
    },
    {
      label: "Active Taxpayer Status Printout",
      note: "FBR active taxpayer list verification.",
      status: company.ntn ? "PARTIAL" : "UNKNOWN",
    },
    {
      label: "Financial Proposal (BOQ / Fee Schedule)",
      note: "Separate sealed financial proposal as required by RFP.",
      status: "UNKNOWN",
    },
    {
      label: "Past Performance Certificates",
      note: "Completion certificates from previous clients for similar scope.",
      status: requirements.some((r) => r.status === "PASS" && /experience|project/i.test(r.requirement)) ? "PARTIAL" : "UNKNOWN",
    },
    {
      label: "Key Staff CVs and Organogram",
      note: "CVs for all named key personnel with relevant experience highlighted.",
      status: "UNKNOWN",
    },
    {
      label: "Affidavit / Undertaking (Non-Blacklisting)",
      note: "Signed affidavit confirming the company is not blacklisted.",
      status: "UNKNOWN",
    },
    {
      label: "Bank Statement (Last 6 months)",
      note: "Bank statements showing financial standing as required.",
      status: "UNKNOWN",
    },
    {
      label: "Authority Letter",
      note: "If proposal is signed by a representative, provide authorization letter.",
      status: "UNKNOWN",
    },
  ];

  // Inject matched requirements as pass items
  for (const r of requirements.filter((r) => r.mandatory && r.status === "PASS")) {
    items.push({
      label: `${r.id}: ${r.requirement.slice(0, 60)}${r.requirement.length > 60 ? "…" : ""}`,
      note: r.evidence,
      status: "PASS",
    });
  }

  return items;
}

// ─── Clean export — proposal sections ONLY (no internal data) ─────────────────
// Use this for the "Export HTML" download so no internal signals leak to clients.

export function renderProposalSectionsOnly(data: PremiumProposalData): string {
  const { meta, company, sections, requirements } = data;

  const tocEntries = sections.map((s, i) => `${i + 1}. ${s.title}`);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.title)} — Technical Proposal</title>
<style>
:root {
  --navy: #1a2f4e;
  --navy-lt: #e8eef7;
  --border: #cbd5e1;
  --text: #111827;
  --muted: #4b5563;
  --accent: #2563eb;
  --slate-lt: #f1f5f9;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 11pt; }
body { font-family: "Segoe UI", Arial, sans-serif; color: var(--text); line-height: 1.65; background: #f8fafc; }
@page { size: A4; margin: 18mm 16mm; }
@page :first { margin: 0; }
@media print {
  body { background: white; }
  .no-print { display: none !important; }
  .page-break { page-break-before: always; }
  .avoid-break { break-inside: avoid; }
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
@media screen { body { max-width: 900px; margin: 0 auto; padding: 0; } }
.print-bar { position: sticky; top: 0; z-index: 100; background: var(--navy); color: white; display: flex; align-items: center; gap: 12px; padding: 10px 20px; }
.print-bar h1 { font-size: 13px; font-weight: 600; flex: 1; }
.btn-print { background: white; color: var(--navy); border: none; border-radius: 5px; padding: 6px 18px; font-size: 12px; font-weight: 700; cursor: pointer; }
.cover { min-height: 100vh; display: grid; grid-template-columns: 8px 1fr; background: white; }
.cover-stripe { background: linear-gradient(180deg, var(--navy) 0%, #2563eb 100%); }
.cover-body { padding: 60px 56px 48px; display: flex; flex-direction: column; }
.cover-title { font-size: 28px; font-weight: 800; color: var(--navy); line-height: 1.25; margin-bottom: 10px; text-transform: uppercase; }
.cover-subtitle { font-size: 14px; color: var(--muted); margin-bottom: 32px; font-style: italic; }
.cover-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; max-width: 540px; margin-bottom: 32px; }
.cover-meta-item label { display: block; font-size: 8px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); margin-bottom: 3px; }
.cover-meta-item p { font-size: 12px; font-weight: 600; color: var(--text); }
.cover-footer { margin-top: auto; padding-top: 28px; border-top: 1px solid var(--border); font-size: 9px; color: var(--muted); }
.doc-body { background: white; padding: 40px 56px; }
@media print { .doc-body { padding: 0; } }
.section-heading { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; margin-top: 48px; padding-bottom: 10px; border-bottom: 2px solid var(--border); break-after: avoid; }
.section-heading:first-child { margin-top: 0; }
.section-num { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: var(--navy); color: white; border-radius: 6px; font-size: 13px; font-weight: 800; flex-shrink: 0; }
.section-heading h2 { font-size: 15px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: 0.05em; }
.toc-list { list-style: none; }
.toc-item { display: flex; align-items: center; gap: 14px; padding: 9px 14px; border-radius: 5px; margin-bottom: 4px; border: 1px solid var(--border); background: var(--slate-lt); break-inside: avoid; }
.toc-num { width: 22px; height: 22px; background: var(--navy); color: white; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; flex-shrink: 0; }
.toc-title { font-size: 11px; font-weight: 600; color: var(--text); }
.section-html { font-size: 11px; line-height: 1.7; color: var(--text); }
.section-html p { margin-bottom: 10px; }
.section-html ul, .section-html ol { margin: 8px 0 12px 20px; }
.section-html li { margin-bottom: 4px; }
.section-html h2 { font-size: 14px; font-weight: 700; color: var(--navy); margin: 14px 0 6px; }
.section-html h3 { font-size: 12px; font-weight: 700; color: var(--navy); margin: 12px 0 5px; }
.section-html table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 14px 0; }
.section-html table thead tr { background: var(--navy); color: white; }
.section-html table thead th { padding: 9px 10px; text-align: left; font-size: 8.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.section-html table tbody tr { border-bottom: 1px solid var(--border); }
.section-html table tbody tr:nth-child(even) { background: var(--slate-lt); }
.section-html table tbody td { padding: 9px 10px; vertical-align: top; line-height: 1.5; }
/* Compliance matrix */
table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 16px 0; break-inside: auto; }
thead tr { background: var(--navy); color: white; }
thead th { padding: 9px 10px; text-align: left; font-size: 8.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
tbody tr { border-bottom: 1px solid var(--border); }
tbody tr:nth-child(even) { background: var(--slate-lt); }
tbody td { padding: 9px 10px; vertical-align: top; line-height: 1.5; }
.td-id { font-weight: 700; font-size: 9px; color: var(--navy); white-space: nowrap; }
.td-evidence { color: var(--muted); font-style: italic; }
.td-action { font-weight: 600; }
/* Badges */
.badge { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid transparent; white-space: nowrap; }
:root { --pass: #16a34a; --pass-bg: #f0fdf4; --pass-bd: #86efac; --partial: #b45309; --partial-bg: #fffbeb; --partial-bd: #fcd34d; --fail: #b91c1c; --fail-bg: #fef2f2; --fail-bd: #fca5a5; --unknown: #1d4ed8; --unknown-bg: #eff6ff; --unknown-bd: #93c5fd; --navy-mid: #23406b; }
.badge-pass { background: var(--pass-bg); color: var(--pass); border-color: var(--pass-bd); }
.badge-partial { background: var(--partial-bg); color: var(--partial); border-color: var(--partial-bd); }
.badge-fail { background: var(--fail-bg); color: var(--fail); border-color: var(--fail-bd); }
.badge-unknown { background: var(--unknown-bg); color: var(--unknown); border-color: var(--unknown-bd); }
.badge-mand { background: var(--navy-lt); color: var(--navy); border-color: var(--navy-mid); font-size: 8px; }
.badge-opt { background: #f8fafc; color: var(--muted); border-color: var(--border); font-size: 8px; }
/* Checklist */
.checklist { list-style: none; }
.checklist li { display: flex; align-items: flex-start; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border); font-size: 10px; break-inside: avoid; }
.checklist-box { width: 14px; height: 14px; border: 1.5px solid var(--border); border-radius: 3px; flex-shrink: 0; margin-top: 1px; background: white; }
.checklist-text { flex: 1; line-height: 1.5; }
.checklist-req { font-size: 8px; color: var(--muted); margin-top: 2px; }
</style>
</head>
<body>
<div class="print-bar no-print">
  <h1>${esc(meta.title)} — Technical Proposal</h1>
  <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
</div>

<div class="cover">
  <div class="cover-stripe"></div>
  <div class="cover-body">
    ${company.logoUrl ? `<img src="${esc(company.logoUrl)}" alt="logo" style="max-height:56px;max-width:180px;object-fit:contain;margin-bottom:20px;" />` : ""}
    <h1 class="cover-title">${esc(or(meta.title, "Technical Proposal"))}</h1>
    <p class="cover-subtitle">${esc(or(meta.sector ?? company.sector, "Professional Services"))} · Procurement Response</p>
    <div class="cover-meta-grid">
      <div class="cover-meta-item"><label>Submitted to</label><p>${esc(or(meta.issuer, "Procuring Agency"))}</p></div>
      <div class="cover-meta-item"><label>Submitted by</label><p>${esc(or(company.companyName, "The Bidder"))}</p></div>
      <div class="cover-meta-item"><label>Submission deadline</label><p>${esc(or(meta.deadline, "As per tender notice"))}</p></div>
      <div class="cover-meta-item"><label>Document date</label><p>${esc(or(meta.preparedDate, new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" })))}</p></div>
      <div class="cover-meta-item"><label>Document version</label><p>${esc(or(meta.version, "v1.0"))}</p></div>
      <div class="cover-meta-item"><label>Contact person</label><p>${esc(or(company.contactPerson, "Authorized Representative"))}</p></div>
    </div>
    <div class="cover-footer">
      ${company.contactEmail ? `${esc(company.contactEmail)}<br>` : ""}
      ${company.phone ? `${esc(company.phone)}<br>` : ""}
      ${company.ntn ? `NTN: ${esc(company.ntn)}<br>` : ""}
      Confidential — For Evaluation Purposes Only
    </div>
  </div>
</div>

<div class="doc-body">

<div class="page-break"></div>
<div class="section-heading">
  <div class="section-num">§</div>
  <h2>Table of Contents</h2>
</div>
<ul class="toc-list">
  ${tocEntries.map((entry, i) => `<li class="toc-item"><span class="toc-num">${i + 1}</span><span class="toc-title">${esc(entry)}</span></li>`).join("")}
</ul>

${sections.map((sec, i) => `
<div class="page-break"></div>
<div class="section-heading avoid-break">
  <div class="section-num">${i + 1}</div>
  <h2>${esc(sec.title)}</h2>
</div>
<div class="section-html">${sec.html || `<p style="color:var(--muted);font-style:italic;">Content not generated.</p>`}</div>
`).join("")}

${requirements && requirements.length > 0 ? `
<div class="page-break"></div>
<div class="section-heading">
  <div class="section-num">A</div>
  <h2>Compliance Matrix</h2>
</div>
<table>
  <thead>
    <tr>
      <th style="width:8%">ID</th>
      <th style="width:30%">Requirement</th>
      <th style="width:9%">Type</th>
      <th style="width:10%">Status</th>
      <th style="width:25%">Evidence summary</th>
      <th style="width:18%">Action required</th>
    </tr>
  </thead>
  <tbody>
    ${requirements.map((r) => `
    <tr class="avoid-break">
      <td class="td-id">${esc(r.id)}</td>
      <td>${esc(r.requirement)}</td>
      <td>${r.mandatory ? `<span class="badge badge-mand">Mandatory</span>` : `<span class="badge badge-opt">Optional</span>`}</td>
      <td>${statusBadge(r.status)}</td>
      <td class="td-evidence">${esc(r.evidence || "No evidence mapped")}</td>
      <td class="td-action">${esc(r.action || "—")}</td>
    </tr>`).join("")}
  </tbody>
</table>

<div class="page-break"></div>
<div class="section-heading">
  <div class="section-num">B</div>
  <h2>Submission Readiness Checklist</h2>
</div>
<ul class="checklist">
  ${buildChecklistItems(requirements, company).map((item) => `
  <li class="avoid-break">
    <div class="checklist-box"></div>
    <div class="checklist-text">
      <strong>${esc(item.label)}</strong>
      <p class="checklist-req">${esc(item.note)}</p>
    </div>
    ${statusBadge(item.status)}
  </li>`).join("")}
</ul>
` : ""}

</div>
</body>
</html>`;
}
