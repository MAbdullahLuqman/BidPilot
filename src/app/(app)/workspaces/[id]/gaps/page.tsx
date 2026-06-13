"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { AlertTriangleIcon, CheckCircle2Icon, XCircleIcon, HelpCircleIcon } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth/auth-provider";
import { useStoredWorkspace, useStoredCompany, type StoredRequirement } from "@/lib/client-storage";

type GapCategory = {
  id: string;
  label: string;
  description: string;
  keywords: RegExp;
  items: StoredRequirement[];
  color: string;
};

const STATUS_ICON = {
  PASS: <CheckCircle2Icon className="size-4 text-emerald-400" />,
  PARTIAL: <AlertTriangleIcon className="size-4 text-amber-300" />,
  FAIL: <XCircleIcon className="size-4 text-red-400" />,
  UNKNOWN: <HelpCircleIcon className="size-4 text-blue-400" />,
};

const STATUS_BADGE: Record<string, string> = {
  PASS: "bg-emerald-400/10 text-emerald-400 border-emerald-400/30",
  PARTIAL: "bg-amber-300/10 text-amber-300 border-amber-300/30",
  FAIL: "bg-red-400/10 text-red-400 border-red-400/30",
  UNKNOWN: "bg-blue-400/10 text-blue-400 border-blue-400/30",
};

export default function GapsPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const workspace = useStoredWorkspace(user, params.id);
  const company = useStoredCompany(user);

  const categories = useMemo<GapCategory[]>(() => {
    if (!workspace) return [];

    const reqs = workspace.requirements;

    const defs: Omit<GapCategory, "items">[] = [
      {
        id: "legal",
        label: "Legal & Tax",
        description: "NTN, STRN, SECP registration, active taxpayer, PEC licenses",
        keywords: /ntn|strn|secp|tax|registration|pec|license|legal|compliance|certification|registered/i,
        color: "text-purple-400",
      },
      {
        id: "technical",
        label: "Technical Capability",
        description: "Technical approach, methodology, work plan, expertise, tools",
        keywords: /technical|methodology|approach|work plan|expertise|software|technology|tools|system|implementation|scope/i,
        color: "text-blue-400",
      },
      {
        id: "experience",
        label: "Past Experience",
        description: "Similar projects, client references, performance certificates, sector experience",
        keywords: /experience|past project|similar|client|reference|performance|certificate|track record|portfolio/i,
        color: "text-amber-300",
      },
      {
        id: "documents",
        label: "Required Documents",
        description: "Submission forms, annexures, signed declarations, CVs, bid bond",
        keywords: /document|form|annex|declaration|signed|cv|resume|bid bond|bank guarantee|letter|undertaking/i,
        color: "text-emerald-400",
      },
      {
        id: "financial",
        label: "Financial Strength",
        description: "Turnover, audited accounts, bank statements, financial capacity",
        keywords: /financial|turnover|audit|accounts|bank statement|balance sheet|revenue|capacity|budget/i,
        color: "text-red-400",
      },
      {
        id: "timeline",
        label: "Timeline & Capacity",
        description: "Availability, mobilization, schedule, team allocation, deadline",
        keywords: /timeline|deadline|schedule|mobiliz|availab|team|staff|manpower|capacity|duration|month/i,
        color: "text-sky-400",
      },
    ];

    const assigned = new Set<string>();

    const cats: GapCategory[] = defs.map((def) => {
      const items = reqs.filter((r) => {
        if (assigned.has(r.id)) return false;
        if (def.keywords.test(r.requirement) || def.keywords.test(r.evidence ?? "")) {
          assigned.add(r.id);
          return true;
        }
        return false;
      });
      return { ...def, items };
    });

    // Uncategorized bucket
    const remaining = reqs.filter((r) => !assigned.has(r.id));
    if (remaining.length) {
      cats.push({
        id: "other",
        label: "Other Requirements",
        description: "Requirements not matching a specific category",
        keywords: /.*/,
        items: remaining,
        color: "text-muted-foreground",
      });
    }

    return cats;
  }, [workspace]);

  if (!workspace) return <PageHeader title="Workspace not found" description="No gap analysis exists for this workspace." />;

  const totalGaps = workspace.requirements.filter((r) => r.status !== "PASS").length;
  const mandatoryGaps = workspace.requirements.filter((r) => r.mandatory && r.status === "FAIL").length;

  return (
    <>
      <PageHeader
        eyebrow={`Gap analysis · ${workspace.id}`}
        title="Gap Category Breakdown"
        description="Requirements grouped by category — legal/tax, technical, experience, documents, financial, timeline."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total requirements", value: workspace.requirements.length, color: "text-foreground" },
          { label: "Open gaps", value: totalGaps, color: "text-amber-300" },
          { label: "Mandatory fails", value: mandatoryGaps, color: mandatoryGaps ? "text-red-400" : "text-emerald-400" },
          { label: "Categories", value: categories.filter((c) => c.items.length > 0).length, color: "text-blue-400" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="rounded-lg border border-border/70 bg-card/55">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-6">
        {categories
          .filter((cat) => cat.items.length > 0)
          .map((cat) => {
            const pass = cat.items.filter((r) => r.status === "PASS").length;
            const fail = cat.items.filter((r) => r.status === "FAIL").length;
            const partial = cat.items.filter((r) => r.status === "PARTIAL").length;
            const pct = Math.round((pass / cat.items.length) * 100);

            return (
              <Card key={cat.id} className="rounded-lg border border-border/70 bg-card/55">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className={`text-base ${cat.color}`}>{cat.label}</CardTitle>
                      <p className="mt-0.5 text-xs text-muted-foreground">{cat.description}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-emerald-400">{pass} pass</span>
                      {partial > 0 && <span className="text-amber-300">{partial} partial</span>}
                      {fail > 0 && <span className="text-red-400">{fail} fail</span>}
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-border/40">
                    <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {cat.items.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-start gap-3 rounded-md border border-border/40 bg-background/30 p-3 text-sm"
                      >
                        <div className="mt-0.5 shrink-0">{STATUS_ICON[req.status]}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{req.id}</span>
                            <span className={`rounded border px-1.5 py-0.5 text-xs ${STATUS_BADGE[req.status]}`}>{req.status}</span>
                            {req.mandatory && (
                              <span className="rounded border border-red-400/30 bg-red-400/10 px-1.5 py-0.5 text-xs text-red-400">
                                MANDATORY
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-muted-foreground">{req.requirement}</p>
                          {req.status !== "PASS" && req.action && (
                            <p className="mt-1 text-xs text-amber-300/80">→ {req.action}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right text-xs text-muted-foreground">
                          {Math.round(req.confidence * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {!company && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Complete your{" "}
          <a href="/company-settings" className="underline">
            company profile
          </a>{" "}
          to improve gap analysis accuracy.
        </p>
      )}
    </>
  );
}
