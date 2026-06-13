"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangleIcon,
  BarChart3Icon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  FileTextIcon,
  GaugeIcon,
  ShieldAlertIcon,
  TrendingUpIcon,
  XCircleIcon,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";
import { useStoredWorkspace, useStoredCompany } from "@/lib/client-storage";
import { cn } from "@/lib/utils";

export default function WorkspacePage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const workspace = useStoredWorkspace(user, params.id);
  const company = useStoredCompany(user);

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
