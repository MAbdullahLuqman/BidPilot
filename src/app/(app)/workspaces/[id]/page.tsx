"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangleIcon,
  BarChart3Icon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  DatabaseIcon,
  FileTextIcon,
  GaugeIcon,
  Loader2Icon,
  ShieldAlertIcon,
  SparklesIcon,
  TrendingUpIcon,
  XCircleIcon,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";
import { useStoredWorkspace, useStoredCompany } from "@/lib/client-storage";
import { useStoredDatasets, useStoredMatchResult, saveWorkspaceMatchResult, type MatchResult } from "@/lib/dataset-store";
import { cn } from "@/lib/utils";

export default function WorkspacePage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const workspace = useStoredWorkspace(user, params.id);
  const company = useStoredCompany(user);
  const datasets = useStoredDatasets(user);
  const activeDataset = datasets.find((d) => d.id === company?.activeDatasetId) ?? datasets[0] ?? null;
  const storedMatch = useStoredMatchResult(user, params.id);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [matchResult, setMatchResult] = useState<MatchResult | null>(storedMatch);

  const metrics = useMemo(() => {
    if (!workspace) return null;
    const reqs = workspace.requirements;
    const total = reqs.length;
    const pass = reqs.filter((r) => r.status === "PASS").length;
    const partial = reqs.filter((r) => r.status === "PARTIAL").length;
    const fail = reqs.filter((r) => r.status === "FAIL").length;
    const unknown = reqs.filter((r) => r.status === "UNKNOWN").length;
    const mandatory = reqs.filter((r) => r.mandatory).length;
    const mandatoryFail = reqs.filter(
      (r) => r.mandatory && (r.status === "FAIL" || r.status === "UNKNOWN"),
    ).length;
    const openGaps = fail + unknown + partial;
    const compliance = total ? Math.round((pass / total) * 100) : 0;
    const winScore = total
      ? Math.min(
          95,
          Math.round(
            compliance * 0.6 +
              (partial / Math.max(total, 1)) * 20 +
              (mandatoryFail === 0 ? 15 : Math.max(0, 15 - mandatoryFail * 5)),
          ),
        )
      : 0;
    const goNoGo =
      winScore >= 80
        ? "STRONG GO"
        : winScore >= 60
          ? "GO WITH CAUTION"
          : winScore >= 40
            ? "NO-GO UNLESS GAPS FIXED"
            : "NO-GO";
    const goNoGoColor =
      winScore >= 80
        ? "text-emerald-400"
        : winScore >= 60
          ? "text-amber-400"
          : "text-red-400";

    // Time saved estimate (per spec formula)
    const pages = Math.max(1, Math.round(workspace.rfpText.length / 3000));
    const proposalSections = 8; // default estimate
    const manualHours = pages * 0.08 + total * 0.15 + proposalSections * 0.5;
    const aiHours = manualHours * 0.35;
    const timeSavedPct = Math.round(((manualHours - aiHours) / manualHours) * 100);

    return {
      total, pass, partial, fail, unknown, mandatory, mandatoryFail,
      openGaps, compliance, winScore, goNoGo, goNoGoColor, timeSavedPct,
    };
  }, [workspace]);

  async function runMatch() {
    if (!workspace || !activeDataset) return;
    setMatching(true);
    setMatchError("");
    try {
      const res = await fetch("/api/datasets/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfpText: workspace.rfpText,
          rfpTitle: workspace.title,
          rfpSector: workspace.sector,
          rfpBudget: "",
          rfpClientType: "",
          dataset: activeDataset,
        }),
      });
      const data = await res.json() as { result?: MatchResult; error?: string };
      if (!res.ok || !data.result) throw new Error(data.error ?? "Match failed");
      setMatchResult(data.result);
      saveWorkspaceMatchResult(user, params.id, data.result);
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : "Match failed");
    } finally {
      setMatching(false);
    }
  }

  if (!workspace || !metrics) return <MissingWorkspace />;

  const tabs = [
    { label: "Analysis", href: `/workspaces/${workspace.id}/analysis`, desc: "Extracted RFP requirements" },
    { label: "Compliance", href: `/workspaces/${workspace.id}/compliance`, desc: "Requirement-level status matrix" },
    { label: "Proposal", href: `/workspaces/${workspace.id}/proposal`, desc: "Evidence-linked proposal studio" },
    { label: "Win Score", href: `/workspaces/${workspace.id}/win-score`, desc: "GO/NO-GO decision and scoring" },
  ];

  // Compute missing company data gaps
  const missingItems: { label: string; href: string; step?: string }[] = [];
  if (!company?.companyName) missingItems.push({ label: "Company name", href: "/company-settings" });
  if (!company?.ntn) missingItems.push({ label: "NTN / STRN number", href: "/company-settings" });
  if (!company?.mainServices) missingItems.push({ label: "Services description", href: "/company-settings" });
  if (!company?.secp) missingItems.push({ label: "Registration number (SECP)", href: "/company-settings" });
  if (!company?.isoCertifications && !company?.otherCertifications && !company?.customCertificates?.length)
    missingItems.push({ label: "Certifications", href: "/company-settings" });

  return (
    <>
      <PageHeader
        eyebrow={`Workspace · ${workspace.id}`}
        title={workspace.title}
        description={`${workspace.issuer || "Issuer not set"} · ${workspace.sector || "No sector"} · Created ${new Date(workspace.createdAt).toLocaleDateString()}`}
      />

      {/* Missing data alert */}
      {missingItems.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-amber-400" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-300">Company profile incomplete</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Missing data reduces AI analysis accuracy. Complete your profile to improve bid scoring.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {missingItems.map((item) => (
                  <Button key={item.label} asChild size="sm" variant="outline" className="h-7 text-xs border-amber-400/40 text-amber-300 hover:bg-amber-400/10">
                    <Link href={item.href}>+ Add {item.label}</Link>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workspace metric cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={BarChart3Icon}
          label="Compliance fit"
          value={metrics.total ? `${metrics.compliance}%` : "—"}
          sub={`${metrics.pass}/${metrics.total} requirements passed`}
          color={metrics.compliance >= 70 ? "emerald" : metrics.compliance >= 50 ? "amber" : "red"}
        />
        <MetricCard
          icon={TrendingUpIcon}
          label="Win probability"
          value={metrics.total ? `${metrics.winScore}%` : "—"}
          sub={metrics.goNoGo}
          color={metrics.winScore >= 70 ? "emerald" : metrics.winScore >= 50 ? "amber" : "red"}
        />
        <MetricCard
          icon={ShieldAlertIcon}
          label="Open gaps"
          value={String(metrics.openGaps)}
          sub={`${metrics.mandatoryFail} mandatory missing`}
          color={metrics.mandatoryFail > 0 ? "red" : metrics.openGaps > 0 ? "amber" : "emerald"}
        />
        <MetricCard
          icon={ClockIcon}
          label="Time saved"
          value={metrics.total ? `${metrics.timeSavedPct}%` : "—"}
          sub="vs. manual preparation"
          color="sky"
        />
      </section>

      <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={GaugeIcon}
          label="GO / NO-GO"
          value={metrics.total ? metrics.goNoGo : "Pending"}
          sub="Based on current evidence"
          color={metrics.winScore >= 70 ? "emerald" : metrics.winScore >= 50 ? "amber" : "red"}
          small
        />
        <MetricCard
          icon={CalendarIcon}
          label="Submission deadline"
          value="Not extracted"
          sub="Run deep analysis to extract"
          color="sky"
          small
        />
        <MetricCard
          icon={FileTextIcon}
          label="Mandatory requirements"
          value={String(metrics.mandatory)}
          sub={`${metrics.mandatoryFail} unmet`}
          color={metrics.mandatoryFail > 0 ? "red" : "emerald"}
          small
        />
        <MetricCard
          icon={XCircleIcon}
          label="Missing evidence"
          value={String(metrics.mandatoryFail + metrics.fail)}
          sub="FAIL + mandatory UNKNOWN"
          color={metrics.mandatoryFail > 0 ? "red" : "emerald"}
          small
        />
      </section>

      {/* Disqualification alert */}
      {metrics.mandatoryFail > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-400/30 bg-red-400/10 p-4">
          <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-semibold text-red-300">Disqualification risk detected</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {metrics.mandatoryFail} mandatory requirement{metrics.mandatoryFail !== 1 ? "s are" : " is"} missing
              verified evidence. Resolve before submission or this bid may be disqualified.
            </p>
          </div>
        </div>
      )}

      {/* Workspace tabs / navigation */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {tabs.map((tab) => (
          <Card key={tab.label} className="rounded-lg border border-border/70 bg-card/55 transition-colors hover:border-border">
            <CardHeader>
              <CardTitle>{tab.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="min-h-10 text-sm text-muted-foreground">{tab.desc}</p>
              <Button asChild className="mt-4" size="sm">
                <Link href={tab.href}>Open →</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dataset match panel */}
      <Card className="mt-6 rounded-lg border border-border/70 bg-card/55">
        <CardHeader>
          <div className="flex items-center gap-2">
            <DatabaseIcon className="size-4 text-sky-400" />
            <CardTitle>Dataset match</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!activeDataset ? (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-muted-foreground">No training dataset found. Import one in Company Settings → Training datasets.</p>
              <Button asChild size="sm" variant="secondary">
                <Link href="/company-settings">Go to Company Settings</Link>
              </Button>
            </div>
          ) : matchResult ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Dataset: <span className="text-foreground">{matchResult.datasetFileName}</span></p>
                  <p className="text-xs text-muted-foreground mt-0.5">Matched against: {matchResult.rfpSector || "Unknown sector"}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={runMatch} disabled={matching}>
                  {matching ? <><Loader2Icon className="size-3.5 animate-spin" /> Matching…</> : <><SparklesIcon className="size-3.5" /> Re-run match</>}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Predicted outcome", value: matchResult.predictedOutcome, color: matchResult.predictedOutcome === "Win" ? "text-emerald-400" : matchResult.predictedOutcome === "Loss" ? "text-red-400" : "text-amber-400" },
                  { label: "Win probability", value: `${matchResult.winProbability}%`, color: matchResult.winProbability >= 60 ? "text-emerald-400" : "text-amber-400" },
                  { label: "Predicted score", value: `${matchResult.predictedScore}%`, color: matchResult.predictedScore >= 70 ? "text-emerald-400" : "text-amber-400" },
                  { label: "Compliance est.", value: `${matchResult.complianceEstimate}%`, color: matchResult.complianceEstimate >= 70 ? "text-emerald-400" : "text-amber-400" },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg border border-border/60 bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className={cn("mt-1 text-xl font-bold", m.color)}>{m.value}</p>
                  </div>
                ))}
              </div>
              {matchResult.groqAnalysis && (
                <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">AI analysis</p>
                  <p className="text-sm text-muted-foreground">{matchResult.groqAnalysis}</p>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {matchResult.strengths.length > 0 && (
                  <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3">
                    <p className="text-xs font-semibold text-emerald-300 mb-2">Strengths ({matchResult.strengths.length})</p>
                    <ul className="space-y-1">
                      {matchResult.strengths.slice(0, 4).map((s, i) => <li key={i} className="text-xs text-muted-foreground">• {s}</li>)}
                    </ul>
                  </div>
                )}
                {matchResult.gaps.length > 0 && (
                  <div className="rounded-lg border border-red-400/20 bg-red-400/5 p-3">
                    <p className="text-xs font-semibold text-red-300 mb-2">Gaps ({matchResult.gaps.length})</p>
                    <ul className="space-y-1">
                      {matchResult.gaps.slice(0, 4).map((g, i) => <li key={i} className="text-xs text-muted-foreground">• {g}</li>)}
                    </ul>
                  </div>
                )}
              </div>
              {matchResult.matchedCapabilities.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Matched capabilities ({matchResult.matchedCapabilities.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {matchResult.matchedCapabilities.slice(0, 8).map((c) => (
                      <span key={c.capId} className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-1 text-xs text-sky-300">
                        {c.domain} — {c.matchScore}%
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Active dataset: <span className="text-foreground font-medium">{activeDataset.fileName}</span></p>
                <p className="text-xs text-muted-foreground mt-0.5">{activeDataset.bidHistory?.length ?? 0} bids · {activeDataset.capabilities?.length ?? 0} capabilities · Win rate: {activeDataset.winRate ?? 0}%</p>
              </div>
              <Button size="sm" onClick={runMatch} disabled={matching || !workspace.rfpText}>
                {matching ? <><Loader2Icon className="size-3.5 animate-spin" /> Matching…</> : <><SparklesIcon className="size-3.5" /> Match against dataset</>}
              </Button>
            </div>
          )}
          {matchError && <p className="mt-2 text-xs text-red-400 rounded bg-red-500/10 px-3 py-2">{matchError}</p>}
        </CardContent>
      </Card>

      {/* RFP text preview */}
      {workspace.rfpText && (
        <Card className="mt-6 rounded-lg border border-border/70 bg-card/55">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2Icon className="size-4 text-emerald-400" />
              <CardTitle>RFP text loaded</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-xs text-muted-foreground">
              {workspace.rfpText.length.toLocaleString()} characters · ~{Math.round(workspace.rfpText.length / 3000)} pages estimated
            </p>
            <div className="max-h-32 overflow-hidden rounded-md border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground">
              {workspace.rfpText.slice(0, 600)}…
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

type MetricColor = "emerald" | "amber" | "red" | "sky" | "violet";

const colorMap: Record<MetricColor, string> = {
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  red: "text-red-400",
  sky: "text-sky-400",
  violet: "text-violet-400",
};

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "sky",
  small = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  color?: MetricColor;
  small?: boolean;
}) {
  return (
    <Card className="rounded-lg border border-border/70 bg-card/55">
      <CardHeader className="pb-2">
        <Icon className={cn("size-4", colorMap[color])} />
        <CardTitle className="text-sm">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn("font-semibold tracking-tight", small ? "text-xl" : "text-3xl")}>{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function MissingWorkspace() {
  return (
    <>
      <PageHeader
        title="Workspace not found"
        description="This workspace does not exist for the current login."
      />
      <Button asChild>
        <Link href="/workspaces">Back to workspaces</Link>
      </Button>
    </>
  );
}
