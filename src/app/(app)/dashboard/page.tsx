"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BarChart3Icon,
  FileTextIcon,
  FolderOpenIcon,
  PlusIcon,
  TrendingUpIcon,
  ZapIcon,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";
import { ROUTES } from "@/lib/constants";
import { useStoredCompany, useStoredWorkspaces } from "@/lib/client-storage";

export default function DashboardPage() {
  const { user } = useAuth();
  const company = useStoredCompany(user);
  const workspaces = useStoredWorkspaces(user);

  const metrics = useMemo(() => {
    const total = workspaces.length;
    const allReqs = workspaces.flatMap((w) => w.requirements);
    const avgCompliance = total
      ? Math.round(
          workspaces.reduce((sum, w) => {
            const pass = w.requirements.filter((r) => r.status === "PASS").length;
            return sum + (w.requirements.length ? (pass / w.requirements.length) * 100 : 0);
          }, 0) / total,
        )
      : 0;
    const avgWin = total
      ? Math.round(
          workspaces.reduce((w_sum, w) => {
            const pass = w.requirements.filter((r) => r.status === "PASS").length;
            const partial = w.requirements.filter((r) => r.status === "PARTIAL").length;
            const comp = w.requirements.length ? (pass / w.requirements.length) * 100 : 0;
            const score = Math.min(95, Math.round(comp * 0.7 + (partial / Math.max(w.requirements.length, 1)) * 20 + 10));
            return w_sum + score;
          }, 0) / total,
        )
      : 0;
    const highRisk = workspaces.filter((w) =>
      w.requirements.some((r) => r.mandatory && (r.status === "FAIL" || r.status === "UNKNOWN")),
    ).length;
    const openGaps = allReqs.filter((r) => r.status !== "PASS").length;

    return { total, avgCompliance, avgWin, highRisk, openGaps };
  }, [workspaces]);

  const globalStats = [
    {
      label: "Total workspaces",
      value: String(metrics.total),
      sub: metrics.total === 0 ? "Create your first RFP workspace" : `${metrics.total} active tender${metrics.total !== 1 ? "s" : ""}`,
      icon: FolderOpenIcon,
      color: "text-sky-400",
    },
    {
      label: "Avg compliance score",
      value: metrics.total ? `${metrics.avgCompliance}%` : "—",
      sub: "Across all workspaces",
      icon: BarChart3Icon,
      color: "text-emerald-400",
    },
    {
      label: "Avg win probability",
      value: metrics.total ? `${metrics.avgWin}%` : "—",
      sub: "Weighted by requirements",
      icon: TrendingUpIcon,
      color: "text-violet-400",
    },
    {
      label: "High-risk tenders",
      value: String(metrics.highRisk),
      sub: "Missing mandatory evidence",
      icon: AlertTriangleIcon,
      color: metrics.highRisk > 0 ? "text-red-400" : "text-emerald-400",
    },
  ] as const;

  return (
    <>
      <PageHeader
        eyebrow="Command center"
        title={
          company?.companyName
            ? `${company.companyName} — bid dashboard`
            : "Set up your bidder profile first."
        }
        description="Account-level overview. Open a workspace for per-tender compliance, proposal, and win-score details."
        action={
          <Button asChild>
            <Link href={company?.companyName ? ROUTES.newWorkspace : ROUTES.companySettings}>
              <PlusIcon />
              {company?.companyName ? "New workspace" : "Add company"}
            </Link>
          </Button>
        }
      />

      {/* Global metric cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {globalStats.map((stat) => (
          <Card key={stat.label} className="rounded-lg border border-border/70 bg-card/55">
            <CardHeader>
              <stat.icon className={`size-5 ${stat.color}`} />
              <CardTitle>{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        {/* Recent workspaces */}
        <Card className="rounded-lg border border-border/70 bg-card/55">
          <CardHeader>
            <CardTitle>
              {workspaces.length ? "Recent workspaces" : "No workspaces yet"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {workspaces.length === 0 ? (
              <div className="rounded-lg border border-border/60 bg-background/40 p-5">
                <p className="text-sm text-muted-foreground">
                  Create your first workspace by uploading or pasting an RFP. BidPilot will extract
                  requirements, match company evidence, and generate a compliant proposal draft.
                </p>
                <Button asChild className="mt-4" variant="secondary">
                  <Link href={ROUTES.newWorkspace}>
                    <PlusIcon /> Create first workspace
                  </Link>
                </Button>
              </div>
            ) : (
              workspaces.slice(0, 5).map((ws) => {
                const pass = ws.requirements.filter((r) => r.status === "PASS").length;
                const comp = ws.requirements.length
                  ? Math.round((pass / ws.requirements.length) * 100)
                  : 0;
                const hasRisk = ws.requirements.some(
                  (r) => r.mandatory && (r.status === "FAIL" || r.status === "UNKNOWN"),
                );
                return (
                  <div
                    key={ws.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-background/40 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{ws.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {ws.issuer || "Issuer not set"} · {ws.requirements.length} requirements
                        {ws.requirements.length > 0 && ` · ${comp}% compliance`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {hasRisk && (
                        <span className="rounded-full bg-red-400/10 px-2 py-0.5 text-xs text-red-300">
                          High risk
                        </span>
                      )}
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/workspaces/${ws.id}`}>
                          Open <ArrowRightIcon className="size-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
            {workspaces.length > 5 && (
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href={ROUTES.workspaces}>
                  View all {workspaces.length} workspaces <ArrowRightIcon className="size-3" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <div className="space-y-4">
          <Card className="rounded-lg border border-border/70 bg-card/55">
            <CardHeader>
              <ZapIcon className="size-5 text-amber-400" />
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button asChild variant="secondary" className="w-full justify-start">
                <Link href={ROUTES.newWorkspace}>
                  <PlusIcon className="size-4" /> New RFP workspace
                </Link>
              </Button>
              <Button asChild variant="secondary" className="w-full justify-start">
                <Link href={ROUTES.companySettings}>
                  <FileTextIcon className="size-4" /> Company settings
                </Link>
              </Button>
              <Button asChild variant="secondary" className="w-full justify-start">
                <Link href={ROUTES.capabilityLibrary}>
                  <BarChart3Icon className="size-4" /> Capability library
                </Link>
              </Button>
              <Button asChild variant="secondary" className="w-full justify-start">
                <Link href={ROUTES.workspaces}>
                  <FolderOpenIcon className="size-4" /> All workspaces
                </Link>
              </Button>
            </CardContent>
          </Card>

          {!company?.companyName && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4">
              <p className="text-xs font-semibold text-amber-300">Company profile missing</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add your company details before creating workspaces to get accurate compliance
                matching and proposal generation.
              </p>
              <Button asChild size="sm" className="mt-3 w-full" variant="secondary">
                <Link href={ROUTES.companySettings}>Set up company</Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
