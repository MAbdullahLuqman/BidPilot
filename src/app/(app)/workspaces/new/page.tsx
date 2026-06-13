"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  FileTextIcon,
  Loader2Icon,
  UploadCloudIcon,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-provider";
import {
  extractRequirements,
  getStoredCompany,
  getStoredWorkspaces,
  saveStoredWorkspaces,
  type StoredWorkspace,
} from "@/lib/client-storage";
import type { ParsedDocument } from "@/app/api/rfp/parse/route";
import type { DeepAnalysisResult } from "@/app/api/rfp/deep-analyze/route";

type Step = "idle" | "parsing" | "analyzing" | "done" | "error";

// Coerce an unknown AI value to a plain string — guards against the AI
// returning a nested object where a string field is expected.
function toStr(val: unknown, fallback = ""): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  // AI hallucinated an object — flatten it to a readable string
  if (typeof val === "object") {
    try {
      return Object.values(val as Record<string, unknown>)
        .map((v) => (typeof v === "string" ? v : String(v ?? "")))
        .filter(Boolean)
        .join(" · ");
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function aiRequirementsToStored(
  requirements: DeepAnalysisResult["requirements"],
): StoredWorkspace["requirements"] {
  return requirements.map((r, i) => ({
    id: toStr(r.id, `REQ-${String(i + 1).padStart(3, "0")}`),
    requirement: toStr(r.requirementText || r.normalizedRequirement, "Requirement text unavailable."),
    mandatory: typeof r.mandatory === "boolean" ? r.mandatory : false,
    status: "UNKNOWN" as const,
    evidence: toStr(r.evidenceNeeded, "No evidence mapped yet."),
    action: r.mandatory
      ? "This is mandatory — add evidence before submission."
      : "Review whether company evidence applies.",
    confidence: 0.5,
  }));
}

export default function NewWorkspacePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("idle");
  const [stepLabel, setStepLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [parsedDoc, setParsedDoc] = useState<ParsedDocument | null>(null);
  const [manualText, setManualText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim() || "Untitled RFP";
    const issuer = String(formData.get("issuer") ?? "").trim();
    const sector = String(formData.get("sector") ?? "").trim();

    let rfpText = "";
    let parsed: ParsedDocument | null = null;

    // Step 1: Parse document
    if (selectedFile) {
      setStep("parsing");
      setStepLabel(`Parsing ${selectedFile.name}…`);
      try {
        const uploadForm = new FormData();
        uploadForm.append("file", selectedFile);
        const res = await fetch("/api/rfp/parse", { method: "POST", body: uploadForm });
        if (!res.ok) throw new Error(`Parse failed: ${res.status}`);
        parsed = (await res.json()) as ParsedDocument;
        rfpText = parsed.fullText;
        setParsedDoc(parsed);
      } catch (err) {
        setError(
          `File parsing failed: ${err instanceof Error ? err.message : String(err)}. Using manual text instead.`,
        );
        rfpText = manualText;
      }
    } else {
      rfpText = manualText;
    }

    if (!rfpText || rfpText.trim().length < 30) {
      setError("Please upload a document or paste at least 30 characters of RFP text.");
      setStep("idle");
      return;
    }

    // Step 2: Deep AI analysis
    setStep("analyzing");
    setStepLabel("Running deep tender analysis (3 passes)…");

    let deepAnalysis: DeepAnalysisResult | null = null;
    let storedRequirements: StoredWorkspace["requirements"] = [];

    try {
      const res = await fetch("/api/rfp/deep-analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rfpText: rfpText.slice(0, 20000),
          sector,
          hasPageMarkers: parsed?.metadata.extractionMethod === "pdf-page-level",
        }),
      });
      if (res.ok) {
        const raw = (await res.json()) as DeepAnalysisResult;
        // Ensure every string[] field actually contains strings (AI can return objects)
        deepAnalysis = {
          ...raw,
          deliverables: (raw.deliverables ?? []).map((v) => toStr(v)),
          requiredDocuments: (raw.requiredDocuments ?? []).map((v) => toStr(v)),
          requiredCertifications: (raw.requiredCertifications ?? []).map((v) => toStr(v)),
          requiredExperience: (raw.requiredExperience ?? []).map((v) => toStr(v)),
          requiredTeamRoles: (raw.requiredTeamRoles ?? []).map((v) => toStr(v)),
          disqualificationClauses: (raw.disqualificationClauses ?? []).map((v) => toStr(v)),
          missedItemsAudit: (raw.missedItemsAudit ?? []).map((v) => toStr(v)),
          evaluationCriteria: (raw.evaluationCriteria ?? []).map((c) =>
            typeof c === "object" && c !== null
              ? { criterion: toStr((c as Record<string, unknown>).criterion), weight: toStr((c as Record<string, unknown>).weight) || null }
              : { criterion: toStr(c), weight: null }
          ),
          requirements: (raw.requirements ?? []).map((r) => ({
            ...r,
            requirementText: toStr(r.requirementText),
            normalizedRequirement: toStr(r.normalizedRequirement),
            sourcePage: r.sourcePage != null ? toStr(r.sourcePage) : null,
            sourceSection: r.sourceSection != null ? toStr(r.sourceSection) : null,
            evidenceNeeded: r.evidenceNeeded != null ? toStr(r.evidenceNeeded) : null,
            proposalSectionImpacted: r.proposalSectionImpacted != null ? toStr(r.proposalSectionImpacted) : null,
          })),
        };
        storedRequirements = aiRequirementsToStored(deepAnalysis.requirements);
      }
    } catch {
      // fall through to naive fallback
    }

    if (!storedRequirements.length) {
      const company = getStoredCompany(user);
      storedRequirements = extractRequirements(rfpText, company);
    }

    // Step 3: Save workspace
    setStep("done");
    setStepLabel("Workspace created!");

    const id = `rfp-${Date.now()}`;
    const workspace: StoredWorkspace = {
      id,
      title,
      issuer,
      sector,
      rfpText,
      requirements: storedRequirements,
      createdAt: new Date().toISOString(),
      deepAnalysis: deepAnalysis ?? undefined,
      parsedPages: parsed?.pages ?? undefined,
    };

    saveStoredWorkspaces(user, [workspace, ...getStoredWorkspaces(user)]);
    router.push(`/workspaces/${id}/analysis`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Create workspace"
        title="Upload or paste your RFP."
        description="BidPilot will parse the document, run a 3-pass deep AI analysis, extract all requirements, and build a compliance checklist."
      />

      <Card className="rounded-lg border border-border/70 bg-card/55">
        <CardHeader>
          <CardTitle>RFP details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Workspace / tender title</Label>
              <Input id="title" name="title" placeholder="e.g. Peshawar Ring Road Technical Proposal" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuer">Issuing authority / client</Label>
              <Input id="issuer" name="issuer" placeholder="e.g. NHA, PPRA, Private Client" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="sector">Sector</Label>
              <Input id="sector" name="sector" placeholder="Construction, IT, Logistics, Consulting…" />
            </div>

            {/* File upload */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="file">Upload RFP document (PDF, DOCX, TXT)</Label>
              <div
                className={`flex items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors ${
                  selectedFile ? "border-emerald-400/50 bg-emerald-400/5" : "border-border/60 hover:border-border"
                }`}
              >
                <UploadCloudIcon className="size-5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  {selectedFile ? (
                    <p className="truncate text-sm font-medium text-emerald-400">
                      <CheckCircle2Icon className="mr-1 inline size-4" />
                      {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No file selected — choose PDF, DOCX, or TXT</p>
                  )}
                </div>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="max-w-52"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            {/* Manual paste fallback */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="text">
                <FileTextIcon className="mr-1 inline size-4" />
                Or paste RFP text (fallback / supplement)
              </Label>
              <textarea
                id="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                rows={10}
                placeholder="Paste the full tender scope, eligibility criteria, mandatory requirements, evaluation criteria, required documents, deadlines, and submission instructions here."
                className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 md:col-span-2">
                <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Progress indicator */}
            {(step === "parsing" || step === "analyzing") && (
              <div className="flex items-center gap-3 rounded-lg border border-sky-400/30 bg-sky-400/10 p-3 md:col-span-2">
                <Loader2Icon className="size-5 shrink-0 animate-spin text-sky-400" />
                <div>
                  <p className="text-sm font-medium text-sky-300">{stepLabel}</p>
                  {step === "analyzing" && (
                    <p className="text-xs text-muted-foreground">
                      Pass 1: Structure → Pass 2: Requirements → Pass 3: Missed requirement audit
                    </p>
                  )}
                </div>
              </div>
            )}

            {parsedDoc && (
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 md:col-span-2">
                <p className="text-xs font-semibold text-emerald-400">Document parsed successfully</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {parsedDoc.metadata.fileName} · ~{parsedDoc.metadata.totalPages} pages ·{" "}
                  {parsedDoc.metadata.charCount.toLocaleString()} characters
                </p>
              </div>
            )}

            <div className="md:col-span-2">
              <Button
                type="submit"
                disabled={step === "parsing" || step === "analyzing"}
                className="w-full sm:w-auto"
              >
                {step === "parsing" || step === "analyzing" ? (
                  <><Loader2Icon className="animate-spin" />{stepLabel}</>
                ) : (
                  <><UploadCloudIcon />Create workspace and analyze RFP</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
