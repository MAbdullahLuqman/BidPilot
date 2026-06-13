"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { AlertTriangleIcon, CheckCircle2Icon, GaugeIcon, HelpCircleIcon, PlusCircleIcon, ShieldAlertIcon, TrendingUpIcon, FileTextIcon, XCircleIcon } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/auth/auth-provider";
import { useStoredWorkspace, useStoredCompany, updateWorkspaceRequirementStatus, type StoredWorkspace, type StoredCompany } from "@/lib/client-storage";

type ScoreBreakdown = {
  mandatoryCompliance: number;
  overallCompliance: number;
  documentReadiness: number;
  partialCredit: number;
  sectorMatch: number;
  certificationFit: number;
  disqualificationPenalty: number;
  total: number;
  decision: string;
  strengths: string[];
  risks: string[];
  nextActions: string[];
};

function computeWinScore(workspace: StoredWorkspace, company: StoredCompany | null): ScoreBreakdown {
  const reqs = workspace.requirements;
  const total = reqs.length || 1;
  const mandatory = reqs.filter((r) => r.mandatory);
  const mandatoryPass = mandatory.filter((r) => r.status === "PASS").length;
  const mandatoryFail = mandatory.filter((r) => r.status === "FAIL").length;
  const pass = reqs.filter((r) => r.status === "PASS").length;
  const partial = reqs.filter((r) => r.status === "PARTIAL").length;

  // Component scores (out of their weight)
  const mandatoryCompliance = mandatory.length
    ? Math.round((mandatoryPass / mandatory.length) * 35)
    : 35;
  const overallCompliance = Math.round((pass / total) * 25);
  const partialCredit = Math.round((partial / total) * 10);

  // Document readiness (15 pts max)
  let docScore = 0;
  if (company) {
    if (company.ntn) docScore += 20;
    if (company.secp) docScore += 15;
    if (company.taxDocsUploaded) docScore += 15;
    if (company.regDocsUploaded) docScore += 15;
    if (company.financialDocsAvailable) docScore += 15;
    if (company.bankStatementsAvailable) docScore += 10;
    if (company.pastProjects?.some((p) => p.performanceCertAvailable)) docScore += 10;
    docScore = Math.min(100, docScore);
  }
  const documentReadiness = Math.round((docScore / 100) * 15);

  // Sector match (10 pts max)
  const rfpSector = (workspace.sector ?? "").toLowerCase();
  const companySector = (company?.sector ?? "").toLowerCase();
  const sectorMatch =
    rfpSector && companySector && (rfpSector.includes(companySector.split(" ")[0] ?? "") || companySector.includes(rfpSector.split(" ")[0] ?? ""))
      ? 10
      : rfpSector && companySector
        ? 5
        : 0;

  // Certification fit (5 pts max)
  const hasCerts = !!(company?.isoCertifications || company?.otherCertifications || company?.pecCategory);
  const certificationFit = hasCerts ? 5 : 0;

  // Disqualification penalty (8 pts per failed mandatory)
  const disqualificationPenalty = Math.min(40, mandatoryFail * 8);

  const rawTotal =
    mandatoryCompliance + overallCompliance + documentReadiness + partialCredit + sectorMatch + certificationFit - disqualificationPenalty;
  const finalTotal = Math.max(0, Math.min(98, rawTotal));

  const decision =
    mandatoryFail > 0
      ? "DISQUALIFICATION RISK"
      : finalTotal >= 80
        ? "STRONG GO"
        : finalTotal >= 60
          ? "GO WITH CAUTION"
          : finalTotal >= 40
            ? "NO-GO UNLESS GAPS FIXED"
            : "NO-GO";

  const strengths: string[] = [];
  const risks: string[] = [];
  const nextActions: string[] = [];

  if (mandatoryPass === mandatory.length && mandatory.length > 0) strengths.push(`All ${mandatory.length} mandatory requirements met`);
  if (pass > total * 0.7) strengths.push(`${pass}/${total} requirements matched (${Math.round((pass / total) * 100)}%)`);
  if (company?.ntn) strengths.push("NTN registered — tax compliance documentable");
  if (company?.secp) strengths.push("SECP registered — legal standing confirmed");
  if (company?.isoCertifications) strengths.push(`ISO certified: ${company.isoCertifications}`);
  if (company?.pastProjects?.length) strengths.push(`${company.pastProjects.length} past projects on file`);
  if (sectorMatch === 10) strengths.push("Strong sector alignment with RFP");

  if (mandatoryFail > 0) risks.push(`${mandatoryFail} MANDATORY requirement(s) failed — disqualification risk`);
  if (!company?.ntn) risks.push("NTN not provided — tax compliance gap");
  if (!company?.secp) risks.push("SECP registration missing");
  if (!company?.taxDocsUploaded) risks.push("Tax documents not uploaded");
  if (!company?.regDocsUploaded) risks.push("Registration documents not uploaded");
  if (partial > 0) risks.push(`${partial} partial matches need evidence strengthening`);
  if (sectorMatch < 5) risks.push("Sector alignment with RFP is weak");

  if (mandatoryFail > 0) nextActions.push("Resolve all FAIL mandatory requirements before submitting");
  if (!company?.ntn) nextActions.push("Add NTN to company settings");
  if (!company?.taxDocsUploaded) nextActions.push("Upload tax documents");
  if (!company?.regDocsUploaded) nextActions.push("Upload registration documents");
  if (!company?.pastProjects?.length) nextActions.push("Add past projects to strengthen experience evidence");
  nextActions.push("Generate proposal and approve all sections before export");

  return {
    mandatoryCompliance,
    overallCompliance,
    documentReadiness,
    partialCredit,
    sectorMatch,
    certificationFit,
    disqualificationPenalty,
    total: finalTotal,
    decision,
    strengths,
    risks,
    nextActions,
  };
}

function evidenceLink(requirement: string): { href: string; label: string } {
  const lower = requirement.toLowerCase();
  if (/ntn|strn|tax|fbr|atl|gst/.test(lower)) return { href: "/company-settings?step=1#tax", label: "Add tax document" };
  if (/secp|cuin|registration|moa|aoa|incorporation/.test(lower)) return { href: "/company-settings?step=1#reg", label: "Add registration doc" };
  if (/iso|pec|pseb|certification|accreditation/.test(lower)) return { href: "/company-settings?step=4", label: "Add certificate" };
  if (/financial|audit|balance sheet|turnover|revenue/.test(lower)) return { href: "/company-settings?step=4", label: "Add financial doc" };
  if (/experience|past project|similar work|project/.test(lower)) return { href: "/company-settings?step=3", label: "Add past project" };
  if (/team|staff|expert|cv|résumé|engineer/.test(lower)) return { href: "/company-settings?step=4", label: "Add team info" };
  return { href: "/company-settings", label: "Add evidence" };
}

const scoreColor = (n: number) =>
  n >= 80 ? "text-emerald-400" : n >= 60 ? "text-amber-300" : "text-red-400";
const decisionBadgeVariant = (d: string): "default" | "secondary" | "destructive" | "outline" =>
  d === "STRONG GO" ? "default" : d === "GO WITH CAUTION" ? "secondary" : "destructive";

export default function WinScorePage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const workspace = useStoredWorkspace(user, params.id);
  const company = useStoredCompany(user);

  function setReqStatus(reqId: string, status: "PASS" | "PARTIAL" | "FAIL") {
    if (!workspace) return;
    updateWorkspaceRequirementStatus(user, workspace.id, reqId, status);
  }

  const score = useMemo(() => {
    if (!workspace) return null;
    return computeWinScore(workspace, company);
  }, [workspace, company]);

  if (!workspace || !score) return <PageHeader title="Workspace not found" description="No win score exists for this workspace." />;

  const mandatory = workspace.requirements.filter((r) => r.mandatory);
  const mandatoryFail = mandatory.filter((r) => r.status === "FAIL");

  const breakdown = [
    { label: "Mandatory compliance", value: score.mandatoryCompliance, max: 35, desc: "Pass rate on must-have requirements" },
    { label: "Overall compliance", value: score.overallCompliance, max: 25, desc: "PASS requirements / total requirements" },
    { label: "Document readiness", value: score.documentReadiness, max: 15, desc: "NTN, SECP, uploaded docs, financials" },
    { label: "Partial credit", value: score.partialCredit, max: 10, desc: "Partial matches with some evidence" },
    { label: "Sector match", value: score.sectorMatch, max: 10, desc: "Company sector vs RFP sector alignment" },
    { label: "Certification fit", value: score.certificationFit, max: 5, desc: "ISO, PEC, other certs present" },
  ];

  return (
    <>
      <PageHeader
        eyebrow={`Win score · ${workspace.id}`}
        title="Win Probability Analysis"
        description="Multi-factor score based on mandatory compliance, document readiness, sector match, and certification fit."
      />

      {mandatoryFail.length > 0 && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4">
          <div className="flex items-center gap-2 text-red-400">
            <ShieldAlertIcon className="size-5" />
            <span className="font-semibold">Disqualification Risk — {mandatoryFail.length} mandatory requirement(s) failed</span>
          </div>
          <ul className="mt-3 space-y-2">
            {mandatoryFail.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-4 rounded-md bg-red-500/10 px-3 py-2">
                <span className="text-sm text-red-300/80 flex-1">• {r.requirement.slice(0, 120)}</span>
                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => setReqStatus(r.id, "PARTIAL")} className="h-6 text-xs px-2 hover:bg-amber-400/20 hover:text-amber-400">Partial</Button>
                  <Button size="sm" variant="ghost" onClick={() => setReqStatus(r.id, "PASS")} className="h-6 text-xs px-2 hover:bg-emerald-400/20 hover:text-emerald-400">Mark Pass</Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* UNKNOWN requirements review section */}
      {workspace.requirements.filter((r) => r.status === "UNKNOWN").length > 0 && (
        <div className="mb-6 rounded-lg border border-sky-400/30 bg-sky-400/10 p-4">
          <div className="flex items-center gap-2 text-sky-400 mb-3">
            <HelpCircleIcon className="size-5" />
            <span className="font-semibold">{workspace.requirements.filter((r) => r.status === "UNKNOWN").length} requirement(s) need your review</span>
          </div>
          <p className="text-xs text-sky-300/80 mb-3">These were extracted by AI analysis. Set their status to improve the win score calculation.</p>
          <div className="space-y-2">
            {workspace.requirements.filter((r) => r.status === "UNKNOWN").map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-4 rounded-md bg-sky-400/10 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-xs text-sky-300">{r.id}</span>
                  {r.mandatory && <span className="ml-2 text-xs text-red-300 bg-red-400/10 px-1.5 py-0.5 rounded-full">Mandatory</span>}
                  <p className="mt-0.5 text-sm text-sky-200/80 leading-relaxed">{r.requirement.slice(0, 140)}</p>
                  {(() => {
                    const { href, label } = evidenceLink(r.requirement);
                    return (
                      <Button asChild size="sm" variant="outline" className="mt-1.5 h-6 text-[10px] border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/10 px-2">
                        <Link href={href}><PlusCircleIcon className="size-3 mr-1" />{label}</Link>
                      </Button>
                    );
                  })()}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setReqStatus(r.id, "PASS")} className="h-6 text-xs px-2 justify-start hover:bg-emerald-400/20 hover:text-emerald-400">
                    <CheckCircle2Icon className="size-3 mr-1" /> Pass
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setReqStatus(r.id, "PARTIAL")} className="h-6 text-xs px-2 justify-start hover:bg-amber-400/20 hover:text-amber-400">
                    <AlertTriangleIcon className="size-3 mr-1" /> Partial
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setReqStatus(r.id, "FAIL")} className="h-6 text-xs px-2 justify-start hover:bg-red-400/20 hover:text-red-400">
                    <XCircleIcon className="size-3 mr-1" /> Fail
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <Card className="rounded-lg border border-border/70 bg-card/55">
          <CardHeader>
            <div className="flex items-center gap-2">
              <GaugeIcon className="size-5 text-emerald-400" />
              <CardTitle>Final score</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div
              className={`flex size-44 flex-col items-center justify-center rounded-full border-2 ${score.total >= 80 ? "border-emerald-400/40 bg-emerald-400/10" : score.total >= 60 ? "border-amber-300/40 bg-amber-300/10" : "border-red-400/40 bg-red-400/10"}`}
            >
              <span className={`text-5xl font-bold ${scoreColor(score.total)}`}>{score.total}%</span>
              <span className="mt-1 text-xs text-muted-foreground">win probability</span>
            </div>
            <Badge variant={decisionBadgeVariant(score.decision)} className="text-sm px-3 py-1">
              {score.decision}
            </Badge>
            {score.disqualificationPenalty > 0 && (
              <p className="text-center text-xs text-red-400">−{score.disqualificationPenalty} pts disqualification penalty applied</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-border/70 bg-card/55">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUpIcon className="size-5 text-blue-400" />
              <CardTitle>Score breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {breakdown.map(({ label, value, max, desc }) => (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{label}</span>
                  <span className="tabular-nums text-muted-foreground">{value} / {max}</span>
                </div>
                <Progress value={(value / max) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className="rounded-lg border border-border/70 bg-card/55">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2Icon className="size-4 text-emerald-400" />
              <CardTitle className="text-base">Strengths</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {score.strengths.length ? (
              score.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-0.5 text-emerald-400">✓</span>
                  <span>{s}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Complete company profile to generate strengths.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-border/70 bg-card/55">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangleIcon className="size-4 text-amber-300" />
              <CardTitle className="text-base">Risks</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {score.risks.length ? (
              score.risks.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-0.5 text-amber-300">⚠</span>
                  <span>{r}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No major risks detected.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-border/70 bg-card/55">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileTextIcon className="size-4 text-blue-400" />
              <CardTitle className="text-base">Next actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {score.nextActions.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-blue-400">{i + 1}.</span>
                <span>{a}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
