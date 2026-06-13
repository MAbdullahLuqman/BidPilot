"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangleIcon,
  BoldIcon,
  CheckCircle2Icon,
  FileDownIcon,
  ItalicIcon,
  ListIcon,
  Loader2Icon,
  PrinterIcon,
  Redo2Icon,
  RotateCcwIcon,
  SaveIcon,
  SparklesIcon,
  Table2Icon,
  ThumbsUpIcon,
  TypeIcon,
  UnderlineIcon,
  Undo2Icon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  clearStoredProposalDraft,
  saveStoredProposalDraft,
  type StoredCompany,
  type StoredProposalDraft,
  type StoredProposalSection,
  type StoredWorkspace,
  useStoredProposalDraft,
} from "@/lib/client-storage";
import { buildProposalDraft, exampleProposalTemplates } from "@/lib/proposal-draft";
import { renderProposalSectionsOnly } from "@/lib/premium-proposal-template";
import { cn } from "@/lib/utils";
import type { GenerateSectionResponse } from "@/app/api/proposal/generate-section/route";
import type { ImproveSectionResponse } from "@/app/api/proposal/improve-section/route";
import type { ProposalPlan } from "@/app/api/proposal/plan/route";
import type { PipelineResponse } from "@/app/api/proposal/pipeline/route";
import type { User } from "firebase/auth";

type ProposalEditorProps = {
  user: User | null;
  workspace: StoredWorkspace;
  company: StoredCompany | null;
};

function buildCompanyProfile(company: StoredCompany | null): string {
  if (!company) return "";
  return [
    `Company: ${company.companyName}`,
    `Sector: ${company.sector}`,
    `City: ${company.city}, ${company.country}`,
    `Services: ${company.mainServices}`,
    `Description: ${company.description}`,
    company.ntn ? `NTN: ${company.ntn}` : "NTN: not provided",
    company.capabilities?.length
      ? `Capabilities:\n${company.capabilities.map((c) => `  - ${c.title}: ${c.evidence}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function ProposalEditor({ user, workspace, company }: ProposalEditorProps) {
  const storedDraft = useStoredProposalDraft(user, workspace.id);
  const generatedDraft = useMemo(() => buildProposalDraft(workspace, company), [company, workspace]);
  const draft = storedDraft ?? generatedDraft;
  const [activeId, setActiveId] = useState(draft.sections[0]?.id ?? "");
  const documentRef = useRef<HTMLDivElement>(null);

  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingSection, setGeneratingSection] = useState<string | null>(null);
  const [improvingSection, setImprovingSection] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState<{ done: number; total: number } | null>(null);
  const [planningProposal, setPlanningProposal] = useState(false);
  const [proposalPlan, setProposalPlan] = useState<ProposalPlan | null>(null);

  const [runningPipeline, setRunningPipeline] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<string | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  const activeSection = draft.sections.find((s) => s.id === activeId) ?? draft.sections[0];

  function patchDraft(updater: (prev: StoredProposalDraft) => StoredProposalDraft) {
    const next = updater(draft);
    saveStoredProposalDraft(user, { ...next, updatedAt: new Date().toISOString() });
  }

  function patchSection(sectionId: string, patch: Partial<StoredProposalSection>) {
    patchDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
    }));
  }

  function updateSectionHtml(sectionId: string, html: string) {
    patchSection(sectionId, { html, approved: false });
  }

  function applyCommand(command: string, value?: string) {
    document.execCommand(command, false, value);
    const el = document.querySelector<HTMLElement>(`[data-section-id="${activeSection?.id}"]`);
    if (activeSection && el) updateSectionHtml(activeSection.id, el.innerHTML);
  }

  function insertEvidenceTable() {
    applyCommand(
      "insertHTML",
      "<table><thead><tr><th>Evidence item</th><th>Source</th><th>Status</th></tr></thead><tbody><tr><td>[Document / certificate]</td><td>[Annexure]</td><td>Required</td></tr></tbody></table>",
    );
  }

  function approveSection(sectionId: string) {
    patchSection(sectionId, { approved: true, evidenceStatus: "READY" });
  }

  async function planProposal() {
    setPlanningProposal(true);
    try {
      const res = await fetch("/api/proposal/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rfpText: workspace.rfpText,
          sector: workspace.sector,
          mandatoryRequirements: workspace.requirements.filter((r) => r.mandatory).map((r) => r.requirement),
          evaluationCriteria: workspace.deepAnalysis?.evaluationCriteria?.map((e) => e.criterion) ?? [],
          requiredProposalSections: workspace.deepAnalysis?.requiredDocuments ?? [],
        }),
      });
      if (res.ok) {
        const plan = (await res.json()) as ProposalPlan;
        setProposalPlan(plan);
        const mustHave = plan.sections.filter((s) => s.priority !== "skip");
        if (mustHave.length > 0) {
          patchDraft((prev) => ({
            ...prev,
            sections: mustHave.map((s, i) => {
              const existing = prev.sections.find((ps) => ps.title === s.title);
              return existing ?? {
                id: `planned-${i}`,
                title: s.title,
                html: `<p><em>${s.purpose}</em></p>`,
                confidence: s.priority === "must-have" ? 0.5 : 0.4,
                sources: [],
                evidenceStatus: "REVIEW" as const,
                requirementsCovered: s.rfpRequirementsCovered,
                evidenceUsed: [],
                missingEvidence: [],
                hallucinationRisk: "MEDIUM" as const,
                improvementSuggestion: s.rationale,
                approved: false,
              };
            }),
          }));
        }
      }
    } finally {
      setPlanningProposal(false);
    }
  }

  async function runProposalPipeline() {
    if (!company) {
      setPipelineError("Company profile is required. Complete it in Company Settings first.");
      return;
    }
    if (!workspace.rfpText || workspace.rfpText.length < 50) {
      setPipelineError("No RFP text found in this workspace. Upload a tender document first.");
      return;
    }

    setRunningPipeline(true);
    setPipelineError(null);
    setPipelineStatus("Stage 2: Grok analyzing tender strategy…");

    try {
      const res = await fetch("/api/proposal/pipeline", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rfpText: workspace.rfpText,
          workspaceId: workspace.id,
          workspaceTitle: workspace.title,
          issuer: workspace.issuer,
          sector: workspace.sector,
          requirements: workspace.requirements,
          company,
        }),
      });

      const data = (await res.json()) as PipelineResponse & {
        workspaceId?: string;
        sectionErrors?: { key: string; error: string }[];
      };

      if (!res.ok || !data.success) {
        const errObj = data as unknown as { error?: string; stage?: string };
        throw new Error(`[${errObj.stage ?? "pipeline"}] ${errObj.error ?? "Pipeline failed"}`);
      }

      setPipelineStatus("Stage 3: Injecting sections into proposal…");

      patchDraft((prev) => ({
        ...prev,
        title: `${workspace.title} — AI Proposal`,
        updatedAt: new Date().toISOString(),
        sections: data.sections.map((s) => ({
          ...s,
          html: prev.sections.find((ps) => ps.id === s.id)?.approved
            ? (prev.sections.find((ps) => ps.id === s.id)?.html ?? s.html)
            : s.html,
        })),
      }));

      if (data.sections[0]) setActiveId(data.sections[0].id);

      const errCount = data.sectionErrors?.length ?? 0;
      setPipelineStatus(
        errCount > 0
          ? `Done — ${data.sections.length} sections generated, ${errCount} section(s) had errors.`
          : `Done — ${data.sections.length} sections generated.`,
      );
    } catch (err) {
      setPipelineError(err instanceof Error ? err.message : "Pipeline failed.");
      setPipelineStatus(null);
    } finally {
      setRunningPipeline(false);
    }
  }

  async function generateAllSections() {
    setGeneratingAll(true);
    const sections = draft.sections;
    setGenProgress({ done: 0, total: sections.length });
    const companyProfile = buildCompanyProfile(company);
    const capabilities = company?.capabilities?.map((c) => `${c.title}: ${c.evidence}`).join("\n") ?? "";

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      setGenProgress({ done: i, total: sections.length });
      setGeneratingSection(sec.id);
      try {
        const res = await fetch("/api/proposal/generate-section", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sectionTitle: sec.title,
            sectionPurpose: "",
            rfpText: workspace.rfpText,
            companyName: company?.companyName ?? "The bidder",
            companyProfile,
            relevantRequirements: workspace.requirements,
            capabilities,
            styleNotes: "",
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as GenerateSectionResponse;
          patchSection(sec.id, {
            html: data.html,
            evidenceUsed: data.evidenceUsed,
            requirementsCovered: data.requirementsCovered,
            missingEvidence: data.missingEvidence,
            confidenceScore: data.confidenceScore,
            hallucinationRisk: data.hallucinationRisk,
            improvementSuggestion: data.improvementSuggestion,
            evidenceStatus: data.missingEvidence.length > 0 ? "NEEDS_EVIDENCE" : "REVIEW",
            approved: false,
          } as Partial<StoredProposalSection>);
        }
      } catch {
        // continue on error
      }
    }

    setGeneratingSection(null);
    setGeneratingAll(false);
    setGenProgress(null);
  }

  async function generateSection(sectionId: string) {
    const sec = draft.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    setGeneratingSection(sectionId);
    const companyProfile = buildCompanyProfile(company);
    const capabilities = company?.capabilities?.map((c) => `${c.title}: ${c.evidence}`).join("\n") ?? "";
    try {
      const res = await fetch("/api/proposal/generate-section", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sectionTitle: sec.title,
          sectionPurpose: "",
          rfpText: workspace.rfpText,
          companyName: company?.companyName ?? "The bidder",
          companyProfile,
          relevantRequirements: workspace.requirements,
          capabilities,
          styleNotes: "",
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as GenerateSectionResponse;
        patchSection(sectionId, {
          html: data.html,
          evidenceUsed: data.evidenceUsed,
          requirementsCovered: data.requirementsCovered,
          missingEvidence: data.missingEvidence,
          confidenceScore: data.confidenceScore,
          hallucinationRisk: data.hallucinationRisk,
          improvementSuggestion: data.improvementSuggestion,
          evidenceStatus: data.missingEvidence.length > 0 ? "NEEDS_EVIDENCE" : "REVIEW",
          approved: false,
        } as Partial<StoredProposalSection>);
      }
    } finally {
      setGeneratingSection(null);
    }
  }

  async function improveSection(sectionId: string) {
    const sec = draft.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    setImprovingSection(sectionId);
    const companyProfile = buildCompanyProfile(company);
    const capabilities = company?.capabilities?.map((c) => `${c.title}: ${c.evidence}`).join("\n") ?? "";
    try {
      const res = await fetch("/api/proposal/improve-section", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sectionTitle: sec.title,
          currentHtml: sec.html,
          improvementSuggestion: sec.improvementSuggestion,
          missingEvidence: sec.missingEvidence,
          rfpText: workspace.rfpText,
          companyProfile,
          capabilities,
          relevantRequirements: workspace.requirements,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as ImproveSectionResponse;
        patchSection(sectionId, {
          html: data.html,
          evidenceUsed: data.evidenceUsed,
          requirementsCovered: data.requirementsCovered,
          missingEvidence: data.missingEvidence,
          confidenceScore: data.confidenceScore,
          hallucinationRisk: data.hallucinationRisk,
          improvementSuggestion: data.improvementSuggestion,
          evidenceStatus: data.missingEvidence.length > 0 ? "NEEDS_EVIDENCE" : "REVIEW",
          approved: false,
        } as Partial<StoredProposalSection>);
      }
    } finally {
      setImprovingSection(null);
    }
  }

  function resetDraft() {
    clearStoredProposalDraft(user, workspace.id);
    setActiveId(generatedDraft.sections[0]?.id ?? "");
  }

  function buildCleanProposalData() {
    return {
      meta: {
        title: workspace.title,
        issuer: workspace.issuer,
        deadline: workspace.deepAnalysis?.submissionDeadline ?? undefined,
        version: "v1.0",
        preparedDate: new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" }),
        sector: workspace.sector ?? company?.sector,
      },
      company: {
        companyName: company?.companyName ?? "The Bidder",
        logoUrl: company?.logoUrl || undefined,
        sector: company?.sector,
        city: company?.city,
        country: company?.country,
        contactPerson: company?.contactPerson,
        contactEmail: company?.contactEmail,
        phone: company?.phone,
        ntn: company?.ntn,
        mainServices: company?.mainServices,
        description: company?.description,
      },
      sections: draft.sections,
      requirements: workspace.requirements,
    };
  }

  function downloadHtml() {
    const html = renderProposalSectionsOnly(buildCleanProposalData());
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${workspace.id}-technical-proposal.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function printProposal() {
    const html = renderProposalSectionsOnly(buildCleanProposalData());
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const popup = window.open(url, "_blank");
    if (!popup) {
      const a = document.createElement("a");
      a.href = url;
      a.download = `${draft.title ?? "proposal"}.html`;
      a.click();
      return;
    }
    popup.addEventListener("load", () => {
      popup.focus();
      popup.print();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    });
  }

  const approvedCount = draft.sections.filter((s) => s.approved).length;
  const needsEvidenceCount = draft.sections.filter((s) => s.evidenceStatus === "NEEDS_EVIDENCE").length;

  return (
    <div className="flex flex-col w-full gap-0" style={{ height: "calc(100vh - 120px)", minHeight: 700 }}>

      {/* ── TOP PANEL: full width controls ───────────────────────────── */}
      <div className="w-full shrink-0 flex flex-col gap-0 border border-border/70 rounded-lg bg-card/55 overflow-hidden">

        {/* Row 1 — section outline tabs */}
        <div className="flex items-center gap-1 px-3 pt-2 pb-1 border-b border-border/60 overflow-x-auto">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 mr-2">
            Sections {approvedCount}/{draft.sections.length}
          </span>
          {draft.sections.map((sec, index) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => {
                setActiveId(sec.id);
                document.querySelector(`[data-section-id="${sec.id}"]`)?.closest("article")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors whitespace-nowrap",
                activeSection?.id === sec.id
                  ? "border-sky-400/60 bg-sky-400/10 text-sky-300 font-semibold"
                  : "border-border/50 bg-background/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <span className="font-mono text-[10px] opacity-60">{index + 1}</span>
              <span className="max-w-[120px] truncate">{sec.title}</span>
              {sec.approved && <CheckCircle2Icon className="size-3 text-emerald-400 shrink-0" />}
              {sec.evidenceStatus === "NEEDS_EVIDENCE" && !sec.approved && (
                <AlertTriangleIcon className="size-3 text-amber-400 shrink-0" />
              )}
              {(generatingSection === sec.id || improvingSection === sec.id) && (
                <Loader2Icon className="size-3 animate-spin text-sky-400 shrink-0" />
              )}
            </button>
          ))}
        </div>

        {/* Row 2 — AI generation + section actions + export */}
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-border/60">
          {/* AI pipeline */}
          <Button
            className="bg-violet-600 hover:bg-violet-700 text-white"
            onClick={runProposalPipeline}
            disabled={runningPipeline || generatingAll || !workspace.rfpText || !company}
            size="sm"
          >
            {runningPipeline
              ? <><Loader2Icon className="animate-spin" />{pipelineStatus ? pipelineStatus.slice(0, 22) + "…" : "Running…"}</>
              : <><SparklesIcon />Full AI Pipeline</>
            }
          </Button>

          <Button
            onClick={planProposal}
            disabled={planningProposal || generatingAll || !workspace.rfpText}
            variant="secondary"
            size="sm"
          >
            {planningProposal ? <><Loader2Icon className="animate-spin" />Planning…</> : <><SparklesIcon />Plan Sections</>}
          </Button>

          <Button
            onClick={generateAllSections}
            disabled={generatingAll || !workspace.rfpText}
            variant="default"
            size="sm"
          >
            {generatingAll
              ? <><Loader2Icon className="animate-spin" />{genProgress ? `${genProgress.done}/${genProgress.total}` : "Generating…"}</>
              : <><SparklesIcon />Generate All</>
            }
          </Button>

          <span className="h-6 w-px bg-border mx-1" />

          {/* Active section actions */}
          {activeSection && (
            <>
              <span className="text-xs text-muted-foreground font-medium shrink-0 max-w-[140px] truncate" title={activeSection.title}>
                {activeSection.title}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={generatingSection === activeSection.id || generatingAll}
                onClick={() => generateSection(activeSection.id)}
              >
                {generatingSection === activeSection.id
                  ? <><Loader2Icon className="animate-spin" />Generating…</>
                  : <><SparklesIcon />Regenerate</>}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={improvingSection === activeSection.id || generatingAll}
                onClick={() => improveSection(activeSection.id)}
              >
                {improvingSection === activeSection.id
                  ? <><Loader2Icon className="animate-spin" />Improving…</>
                  : <><WrenchIcon />Improve</>}
              </Button>
              <Button
                size="sm"
                variant={activeSection.approved ? "secondary" : "default"}
                onClick={() => approveSection(activeSection.id)}
                disabled={activeSection.approved}
              >
                <ThumbsUpIcon />
                {activeSection.approved ? "Approved ✓" : "Approve"}
              </Button>
            </>
          )}

          <span className="h-6 w-px bg-border mx-1" />

          {/* Formatting */}
          <Button size="icon-sm" variant="secondary" title="Undo" onClick={() => applyCommand("undo")}><Undo2Icon className="size-3.5" /></Button>
          <Button size="icon-sm" variant="secondary" title="Redo" onClick={() => applyCommand("redo")}><Redo2Icon className="size-3.5" /></Button>
          <Button size="icon-sm" variant="secondary" title="Bold" onClick={() => applyCommand("bold")}><BoldIcon className="size-3.5" /></Button>
          <Button size="icon-sm" variant="secondary" title="Italic" onClick={() => applyCommand("italic")}><ItalicIcon className="size-3.5" /></Button>
          <Button size="icon-sm" variant="secondary" title="Underline" onClick={() => applyCommand("underline")}><UnderlineIcon className="size-3.5" /></Button>
          <Button size="icon-sm" variant="secondary" title="Heading" onClick={() => applyCommand("formatBlock", "h2")}><TypeIcon className="size-3.5" /></Button>
          <Button size="icon-sm" variant="secondary" title="Bullet list" onClick={() => applyCommand("insertUnorderedList")}><ListIcon className="size-3.5" /></Button>
          <Button size="icon-sm" variant="secondary" title="Insert table" onClick={insertEvidenceTable}><Table2Icon className="size-3.5" /></Button>

          <span className="h-6 w-px bg-border mx-1" />

          {/* Export */}
          <Button size="sm" variant="secondary" onClick={downloadHtml} className="h-7 text-xs"><SaveIcon className="size-3.5" />Export HTML</Button>
          <Button size="sm" onClick={printProposal} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"><PrinterIcon className="size-3.5" />Export PDF</Button>
          <Button size="sm" variant="destructive" onClick={resetDraft} className="h-7 text-xs"><RotateCcwIcon className="size-3.5" />Reset</Button>
        </div>

        {/* Row 3 — status messages + alerts (only when there's something to show) */}
        {(pipelineStatus || pipelineError || needsEvidenceCount > 0 || proposalPlan ||
          (activeSection && (activeSection.missingEvidence.length > 0 || activeSection.improvementSuggestion))) && (
          <div className="flex flex-wrap items-start gap-2 px-3 py-2 text-[11px]">
            {pipelineStatus && !runningPipeline && (
              <span className="rounded border border-violet-400/30 bg-violet-400/8 px-2 py-1 text-violet-300">{pipelineStatus}</span>
            )}
            {pipelineError && (
              <span className="rounded border border-red-400/30 bg-red-400/8 px-2 py-1 text-red-300">{pipelineError}</span>
            )}
            {proposalPlan && (
              <span className="rounded border border-sky-400/30 bg-sky-400/8 px-2 py-1 text-sky-300">
                Plan: {proposalPlan.sections.filter((s) => s.priority !== "skip").length} sections · {proposalPlan.skippedSections.length} skipped
              </span>
            )}
            {needsEvidenceCount > 0 && (
              <span className="rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-amber-300">
                <AlertTriangleIcon className="inline mr-1 size-3" />
                {needsEvidenceCount} section{needsEvidenceCount > 1 ? "s" : ""} need evidence
              </span>
            )}
            {activeSection?.missingEvidence.map((item, i) => (
              <span key={i} className="rounded border border-amber-400/20 bg-amber-400/5 px-2 py-1 text-amber-200/80 flex items-center gap-1">
                <XCircleIcon className="size-3 shrink-0 text-amber-400" />{item}
              </span>
            ))}
            {activeSection?.improvementSuggestion && (
              <span className="rounded border border-sky-400/20 bg-sky-400/5 px-2 py-1 text-sky-200/80">
                💡 {activeSection.improvementSuggestion}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── EDITOR: full width, takes remaining height ────────────────── */}
      <div className="flex-1 overflow-y-auto mt-3 w-full">
        <div
          ref={documentRef}
          className="w-full bg-white text-slate-950 shadow-lg ring-1 ring-slate-200"
          style={{ padding: "56px 80px", minHeight: "100%" }}
        >
          {draft.sections.map((sec, index) => (
            <article key={sec.id} className="border-b border-slate-200 py-10 last:border-0">
              <h2
                className="text-xl font-bold text-slate-900 leading-tight mb-5 cursor-pointer select-none"
                onClick={() => setActiveId(sec.id)}
              >
                {index + 1}. {sec.title}
                {sec.approved && (
                  <CheckCircle2Icon className="inline ml-2 size-4 text-emerald-600 align-middle" />
                )}
              </h2>
              <div
                data-section-id={sec.id}
                contentEditable
                suppressContentEditableWarning
                onFocus={() => setActiveId(sec.id)}
                onInput={(e) => updateSectionHtml(sec.id, e.currentTarget.innerHTML)}
                className={cn(
                  "min-h-32 rounded-md border p-3 leading-8 text-base outline-none transition-colors",
                  activeSection?.id === sec.id
                    ? "border-sky-300 bg-sky-50/30"
                    : "border-transparent hover:border-slate-200",
                )}
                dangerouslySetInnerHTML={{ __html: sec.html }}
              />
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
