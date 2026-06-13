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

      {/* Workspace metric cards — dataset match values take priority when available */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={BarChart3Icon}
          label="Compliance fit"
          value={matchResult ? `${matchResult.complianceEstimate}%` : metrics.total ? `${metrics.compliance}%` : "—"}
          sub={matchResult ? `Dataset: ${matchResult.datasetFileName}` : `${metrics.pass}/${metrics.total} requirements passed`}
          color={(matchResult?.complianceEstimate ?? metrics.compliance) >= 70 ? "emerald" : (matchResult?.complianceEstimate ?? metrics.compliance) >= 50 ? "amber" : "red"}
          badge={matchResult ? "AI" : undefined}
        />
        <MetricCard
          icon={TrendingUpIcon}
          label="Win probability"
          value={matchResult ? `${matchResult.winProbability}%` : metrics.total ? `${metrics.winScore}%` : "—"}
          sub={matchResult ? matchResult.predictedOutcome : metrics.goNoGo}
          color={(matchResult?.winProbability ?? metrics.winScore) >= 70 ? "emerald" : (matchResult?.winProbability ?? metrics.winScore) >= 50 ? "amber" : "red"}
          badge={matchResult ? "AI" : undefined}
        />
        <MetricCard
          icon={ShieldAlertIcon}
          label="Open gaps"
          value={matchResult ? String(matchResult.gaps.length) : String(metrics.openGaps)}
          sub={matchResult ? `${matchResult.strengths.length} strengths identified` : `${metrics.mandatoryFail} mandatory missing`}
          color={matchResult ? (matchResult.gaps.length > 5 ? "red" : matchResult.gaps.length > 2 ? "amber" : "emerald") : metrics.mandatoryFail > 0 ? "red" : metrics.openGaps > 0 ? "amber" : "emerald"}
          badge={matchResult ? "AI" : undefined}
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
          value={matchResult ? matchResult.predictedOutcome : metrics.total ? metrics.goNoGo : "Pending"}
          sub={matchResult ? `Score: ${matchResult.predictedScore}%` : "Based on current evidence"}
          color={matchResult
            ? matchResult.predictedOutcome === "Win" ? "emerald" : matchResult.predictedOutcome === "Loss" ? "red" : "amber"
            : metrics.winScore >= 70 ? "emerald" : metrics.winScore >= 50 ? "amber" : "red"}
          small
          badge={matchResult ? "AI" : undefined}
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
          label="Matched capabilities"
          value={matchResult ? String(matchResult.matchedCapabilities.length) : String(metrics.mandatory)}
          sub={matchResult ? `from ${matchResult.datasetFileName}` : `${metrics.mandatoryFail} unmet`}
          color={matchResult ? (matchResult.matchedCapabilities.length >= 5 ? "emerald" : matchResult.matchedCapabilities.length >= 2 ? "amber" : "red") : metrics.mandatoryFail > 0 ? "red" : "emerald"}
          small
          badge={matchResult ? "AI" : undefined}
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

      {/* Dataset match strip */}
      <div className="mt-4 rounded-lg border border-border/70 bg-card/55 px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <DatabaseIcon className="size-4 text-sky-400 shrink-0" />
            {matchResult ? (
              <span className="text-sm">
                <span className="text-muted-foreground">Dataset matched: </span>
                <span className="font-medium">{matchResult.datasetFileName}</span>
                <span className="text-muted-foreground"> · sector: {matchResult.rfpSector || "—"}</span>
              </span>
            ) : activeDataset ? (
              <span className="text-sm text-muted-foreground">
                Active dataset: <span className="text-foreground font-medium">{activeDataset.fileName}</span>
                <span className="ml-2 text-xs">({activeDataset.bidHistory?.length ?? 0} bids · {activeDataset.capabilities?.length ?? 0} caps)</span>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">No training dataset — <Link href="/company-settings" className="text-sky-400 hover:underline">import one in Company Settings</Link></span>
            )}
          </div>
          {activeDataset && (
            <Button size="sm" variant={matchResult ? "secondary" : "default"} onClick={runMatch} disabled={matching || !workspace.rfpText}>
              {matching ? <><Loader2Icon className="size-3.5 animate-spin" /> Matching…</> : <><SparklesIcon className="size-3.5" />{matchResult ? "Re-run match" : "Match against dataset"}</>}
            </Button>
          )}
        </div>
        {matchError && <p className="mt-2 text-xs text-red-400 rounded bg-red-500/10 px-3 py-2">{matchError}</p>}
      </div>

      {/* Dataset match details — shown inline below metrics when a match exists */}
      {matchResult && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* Matched capabilities */}
          {matchResult.matchedCapabilities.length > 0 && (
            <Card className="rounded-lg border border-sky-400/20 bg-sky-400/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2Icon className="size-4 text-sky-400" />
                  <CardTitle className="text-sky-300">Matched capabilities ({matchResult.matchedCapabilities.length})</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {matchResult.matchedCapabilities.slice(0, 6).map((c) => (
                  <div key={c.capId} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.domain}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.matchReason}</p>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", c.matchScore >= 70 ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300")}>
                      {c.matchScore}%
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Strengths & Gaps */}
          <div className="space-y-4">
            {matchResult.strengths.length > 0 && (
              <Card className="rounded-lg border border-emerald-400/20 bg-emerald-400/5">
                <CardHeader>
                  <CardTitle className="text-emerald-300 text-sm">Strengths ({matchResult.strengths.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {matchResult.strengths.slice(0, 4).map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />{s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {matchResult.gaps.length > 0 && (
              <Card className="rounded-lg border border-red-400/20 bg-red-400/5">
                <CardHeader>
                  <CardTitle className="text-red-300 text-sm">Gaps to address ({matchResult.gaps.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {matchResult.gaps.slice(0, 4).map((g, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0 text-red-400" />{g}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* AI analysis & recommendations */}
          {(matchResult.groqAnalysis || matchResult.recommendations.length > 0) && (
            <Card className="rounded-lg border border-border/70 bg-card/55 md:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <SparklesIcon className="size-4 text-violet-400" />
                  <CardTitle>AI strategic analysis</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {matchResult.groqAnalysis && <p className="text-sm text-muted-foreground">{matchResult.groqAnalysis}</p>}
                {matchResult.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Recommendations</p>
                    <ul className="space-y-1.5">
                      {matchResult.recommendations.map((r, i) => (
                        <li key={i} className="text-xs text-muted-foreground">→ {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

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
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  color?: MetricColor;
  small?: boolean;
  badge?: string;
}) {
  return (
    <Card className={cn("rounded-lg border bg-card/55", badge ? "border-sky-400/30" : "border-border/70")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Icon className={cn("size-4", colorMap[color])} />
          {badge && <span className="rounded-full bg-sky-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-300">{badge}</span>}
        </div>
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
