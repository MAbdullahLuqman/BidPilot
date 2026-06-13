"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  FileTextIcon,
  PlusCircleIcon,
  XCircleIcon,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/auth/auth-provider";
import {
  useStoredWorkspace,
  useStoredCompany,
  type StoredRequirement,
} from "@/lib/client-storage";
import { mapRequirementToCompanyDocument } from "@/lib/companyDocumentRegistry";
import { ROUTES } from "@/lib/constants";

// ── GO/NO-GO helpers ────────────────────────────────────────────────────────────

function computeReadiness(requirements: StoredRequirement[]) {
  const total = requirements.length;
  const mandatory = requirements.filter((r) => r.mandatory);
  const passCount = requirements.filter((r) => r.status === "PASS").length;
  const partialCount = requirements.filter((r) => r.status === "PARTIAL").length;
  const failCount = requirements.filter((r) => r.status === "FAIL").length;
  const unknownCount = requirements.filter((r) => r.status === "UNKNOWN").length;
  const mandatoryFail = mandatory.filter(
    (r) => r.status === "FAIL" || r.status === "UNKNOWN",
  ).length;
  const complianceScore = total ? Math.round((passCount / total) * 100) : 0;

  let decision: "STRONG_GO" | "GO_WITH_CAUTION" | "NO_GO_UNLESS_FIXED" | "NO_GO";
  if (mandatoryFail > 2 || complianceScore < 40) {
    decision = "NO_GO";
  } else if (mandatoryFail > 0 || complianceScore < 60) {
    decision = "NO_GO_UNLESS_FIXED";
  } else if (complianceScore < 80) {
    decision = "GO_WITH_CAUTION";
  } else {
    decision = "STRONG_GO";
  }

  return {
    total,
    passCount,
    partialCount,
    failCount,
    unknownCount,
    mandatoryFail,
    complianceScore,
    decision,
    mandatoryCount: mandatory.length,
  };
}

const DECISION_STYLES: Record<
  string,
  { label: string; bg: string; border: string; text: string }
> = {
  STRONG_GO: {
    label: "Strong GO",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    text: "text-emerald-700",
  },
  GO_WITH_CAUTION: {
    label: "GO with caution",
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-700",
  },
  NO_GO_UNLESS_FIXED: {
    label: "NO-GO unless gaps fixed",
    bg: "bg-orange-50",
    border: "border-orange-300",
    text: "text-orange-700",
  },
  NO_GO: {
    label: "NO-GO",
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-700",
  },
};

function statusBadgeVariant(
  status: StoredRequirement["status"],
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "PASS") return "default";
  if (status === "PARTIAL") return "secondary";
  if (status === "FAIL") return "destructive";
  return "outline";
}

export default function ReadinessPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const workspace = useStoredWorkspace(user, params.id);
  const company = useStoredCompany(user);

  const readiness = useMemo(
    () => (workspace ? computeReadiness(workspace.requirements) : null),
    [workspace],
  );

  // Map FAIL/UNKNOWN requirements to company documents
  const missingDocCards = useMemo(() => {
    if (!workspace) return [];
    return workspace.requirements
      .filter((r) => r.status === "FAIL" || r.status === "UNKNOWN")
      .map((req) => ({
        req,
        doc: mapRequirementToCompanyDocument(req.requirement),
      }))
      .filter((item) => item.doc !== null) as {
      req: StoredRequirement;
      doc: NonNullable<ReturnType<typeof mapRequirementToCompanyDocument>>;
    }[];
  }, [workspace]);

  const hasMandatoryGaps =
    workspace?.requirements.some(
      (r) => r.mandatory && (r.status === "FAIL" || r.status === "UNKNOWN"),
    ) ?? false;

  if (!workspace) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        Workspace not found.{" "}
        <Link href={ROUTES.workspaces} className="underline">
          Back to workspaces
        </Link>
      </div>
    );
  }

  const decisionStyle = DECISION_STYLES[readiness?.decision ?? "NO_GO"];

  return (
    <div>
      <PageHeader
        eyebrow="Workspace · Bid Readiness"
        title="Bid Readiness Report"
        description="Internal assessment of your readiness to submit. This page is never exported to the proposal."
        action={
          <Button asChild variant="secondary" size="sm">
            <Link href={`/workspaces/${params.id}/proposal`}>
              <FileTextIcon className="size-4" /> Proposal Studio
            </Link>
          </Button>
        }
      />

      {/* ── Tender header card ── */}
      <Card className="mb-6">
        <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Tender title
            </p>
            <p className="font-semibold text-sm leading-snug">{workspace.title}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Issuer / Agency
            </p>
            <p className="text-sm">{workspace.issuer || "Not specified"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Submission deadline
            </p>
            <p className="text-sm">
              {workspace.deepAnalysis?.submissionDeadline ?? "Not available"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── GO / NO-GO recommendation card ── */}
      {readiness && (
        <Card
          className={`mb-6 border-2 ${decisionStyle.border} ${decisionStyle.bg}`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <ClipboardCheckIcon
                className={`size-5 ${decisionStyle.text}`}
              />
              <CardTitle className={`text-base ${decisionStyle.text}`}>
                GO / NO-GO Recommendation
              </CardTitle>
              <span className="ml-auto font-bold text-lg tracking-wide">
                <span className={decisionStyle.text}>{decisionStyle.label}</span>
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Based on {readiness.total} extracted requirements:{" "}
              <strong>{readiness.passCount} PASS</strong>,{" "}
              <strong>{readiness.partialCount} PARTIAL</strong>,{" "}
              <strong>{readiness.failCount} FAIL</strong>,{" "}
              <strong>{readiness.unknownCount} UNKNOWN</strong>.{" "}
              {readiness.mandatoryFail > 0 && (
                <span className="text-red-600 font-semibold">
                  {readiness.mandatoryFail} mandatory requirement
                  {readiness.mandatoryFail > 1 ? "s" : ""} have no verified
                  evidence.
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Compliance score breakdown ── */}
      {readiness && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Compliance Score Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Overall compliance</span>
                <span className="font-semibold">{readiness.complianceScore}%</span>
              </div>
              <Progress value={readiness.complianceScore} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Total requirements
                </p>
                <p className="text-xl font-bold">{readiness.total}</p>
              </div>
              <div className="rounded-lg border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Mandatory requirements
                </p>
                <p className="text-xl font-bold">{readiness.mandatoryCount}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-xs text-emerald-600 uppercase tracking-wider mb-1">
                  PASS
                </p>
                <p className="text-xl font-bold text-emerald-700">
                  {readiness.passCount}
                </p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-xs text-red-600 uppercase tracking-wider mb-1">
                  FAIL / UNKNOWN
                </p>
                <p className="text-xl font-bold text-red-700">
                  {readiness.failCount + readiness.unknownCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Mandatory requirements list ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">Mandatory Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          {workspace.requirements.filter((r) => r.mandatory).length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No mandatory requirements extracted. Run deep analysis first.
            </p>
          ) : (
            <div className="space-y-2">
              {workspace.requirements
                .filter((r) => r.mandatory)
                .map((req) => (
                  <div
                    key={req.id}
                    className="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm"
                  >
                    {req.status === "PASS" ? (
                      <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    ) : req.status === "PARTIAL" ? (
                      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-500" />
                    ) : (
                      <XCircleIcon className="mt-0.5 size-4 shrink-0 text-red-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[10px] text-muted-foreground mb-0.5">
                        {req.id}
                      </p>
                      <p className="leading-snug">{req.requirement}</p>
                      {req.evidence && (
                        <p className="mt-1 text-xs text-muted-foreground italic">
                          {req.evidence}
                        </p>
                      )}
                    </div>
                    <Badge variant={statusBadgeVariant(req.status)} className="shrink-0">
                      {req.status}
                    </Badge>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Missing documents section ── */}
      {missingDocCards.length > 0 && (
        <Card className="mb-6 border-amber-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangleIcon className="size-4 text-amber-500" />
              <CardTitle className="text-sm text-amber-700">
                Missing Documents Detected
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              These documents appear to be required but are not yet uploaded to your
              company profile. Click "Add" to go to the relevant setting.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {missingDocCards.map(({ req, doc }) => (
                <div
                  key={`${req.id}-${doc.id}`}
                  className="rounded-lg border border-amber-100 bg-amber-50/60 p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold leading-tight">{doc.name}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                        {doc.category.replace(/_/g, " ")}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[9px]">
                      {req.id}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {doc.description}
                  </p>
                  <p className="text-xs text-amber-700 font-medium">
                    Required for: {req.requirement.slice(0, 80)}
                    {req.requirement.length > 80 ? "…" : ""}
                  </p>
                  <Button asChild size="sm" variant="secondary" className="w-full mt-1">
                    <Link href={`${ROUTES.companySettings}?highlight=${doc.id}`}>
                      <PlusCircleIcon className="size-3.5" />
                      Add {doc.name}
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Export warning ── */}
      {hasMandatoryGaps && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <XCircleIcon className="size-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-700 text-sm">
                  Do not submit yet — mandatory gaps remain
                </p>
                <p className="text-xs text-red-600 mt-1 leading-relaxed">
                  One or more mandatory requirements have FAIL or UNKNOWN status.
                  Submitting without resolving these items may result in
                  disqualification. Resolve the missing documents above before
                  exporting your proposal.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
