"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2Icon, AlertTriangleIcon, XCircleIcon, HelpCircleIcon, PlusCircleIcon } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { useStoredWorkspace, updateWorkspaceRequirementStatus } from "@/lib/client-storage";
import { cn } from "@/lib/utils";

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

const statusClass = {
  PASS: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  PARTIAL: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  FAIL: "border-red-400/40 bg-red-400/10 text-red-300",
  UNKNOWN: "border-sky-400/40 bg-sky-400/10 text-sky-300",
} as const;

const statusIcon = {
  PASS: <CheckCircle2Icon className="size-3.5 text-emerald-400" />,
  PARTIAL: <AlertTriangleIcon className="size-3.5 text-amber-400" />,
  FAIL: <XCircleIcon className="size-3.5 text-red-400" />,
  UNKNOWN: <HelpCircleIcon className="size-3.5 text-sky-400" />,
};

export default function CompliancePage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const workspace = useStoredWorkspace(user, params.id);

  if (!workspace) return <PageHeader title="Workspace not found" description="No compliance checklist exists for this login/workspace." />;

  function setStatus(reqId: string, status: "PASS" | "PARTIAL" | "FAIL") {
    updateWorkspaceRequirementStatus(user, workspace!.id, reqId, status);
  }

  const pass = workspace.requirements.filter((r) => r.status === "PASS").length;
  const partial = workspace.requirements.filter((r) => r.status === "PARTIAL").length;
  const fail = workspace.requirements.filter((r) => r.status === "FAIL").length;
  const unknown = workspace.requirements.filter((r) => r.status === "UNKNOWN").length;

  return (
    <>
      <PageHeader
        eyebrow={`Compliance · ${workspace.id}`}
        title="Requirement-by-requirement compliance matrix"
        description="Review each requirement and mark its status. UNKNOWN items from AI analysis need your review."
      />

      {/* Summary bar */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Pass", value: pass, cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" },
          { label: "Partial", value: partial, cls: "text-amber-400 bg-amber-400/10 border-amber-400/30" },
          { label: "Fail", value: fail, cls: "text-red-400 bg-red-400/10 border-red-400/30" },
          { label: "Unknown (needs review)", value: unknown, cls: "text-sky-400 bg-sky-400/10 border-sky-400/30" },
        ].map(({ label, value, cls }) => (
          <div key={label} className={cn("rounded-lg border px-4 py-3 text-sm font-medium", cls)}>
            <span className="text-2xl font-bold">{value}</span>
            <p className="mt-0.5 text-xs opacity-80">{label}</p>
          </div>
        ))}
      </div>

      {unknown > 0 && (
        <div className="mb-5 rounded-lg border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-sm text-sky-300">
          <strong>{unknown} requirement{unknown !== 1 ? "s are" : " is"} UNKNOWN</strong> — these were extracted by AI but haven't been assessed yet. Use the buttons in each row to set their status.
        </div>
      )}

      <Card className="rounded-lg border border-border/70 bg-card/55">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border/60">
              <tr>
                <th className="px-4 py-3 w-8">#</th>
                <th className="px-4 py-3">Requirement</th>
                <th className="px-4 py-3 w-28">Status</th>
                <th className="px-4 py-3">Matched evidence</th>
                <th className="px-4 py-3">Suggested action</th>
                <th className="px-4 py-3 w-36 text-center">Set status</th>
                <th className="px-4 py-3 w-20">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {workspace.requirements.map((item, idx) => (
                <tr key={item.id} className="border-b border-border/40 align-top hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-4 text-xs text-muted-foreground font-mono">{idx + 1}</td>
                  <td className="px-4 py-4">
                    <p className="font-medium font-mono text-xs text-muted-foreground">{item.id}</p>
                    <p className="mt-1 text-muted-foreground leading-relaxed">{item.requirement}</p>
                    {item.mandatory && (
                      <span className="mt-1.5 inline-block rounded-full bg-red-400/10 border border-red-400/30 px-2 py-0.5 text-xs text-red-300">Mandatory</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", statusClass[item.status])}>
                      {statusIcon[item.status]}
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground text-xs leading-relaxed">
                    {item.evidence}
                    {(item.status === "UNKNOWN" || item.status === "FAIL" || item.status === "PARTIAL") && (() => {
                      const { href, label } = evidenceLink(item.requirement);
                      return (
                        <Button asChild size="sm" variant="outline" className="mt-2 h-6 text-[10px] border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/10 px-2">
                          <Link href={href}><PlusCircleIcon className="size-3 mr-1" />{label}</Link>
                        </Button>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground text-xs leading-relaxed">{item.action}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={item.status === "PASS"}
                        onClick={() => setStatus(item.id, "PASS")}
                        className="h-7 text-xs justify-start px-2 hover:bg-emerald-400/10 hover:text-emerald-400 disabled:opacity-40"
                      >
                        <CheckCircle2Icon className="size-3 mr-1" /> Pass
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={item.status === "PARTIAL"}
                        onClick={() => setStatus(item.id, "PARTIAL")}
                        className="h-7 text-xs justify-start px-2 hover:bg-amber-400/10 hover:text-amber-400 disabled:opacity-40"
                      >
                        <AlertTriangleIcon className="size-3 mr-1" /> Partial
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={item.status === "FAIL"}
                        onClick={() => setStatus(item.id, "FAIL")}
                        className="h-7 text-xs justify-start px-2 hover:bg-red-400/10 hover:text-red-400 disabled:opacity-40"
                      >
                        <XCircleIcon className="size-3 mr-1" /> Fail
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm font-medium">{Math.round(item.confidence * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}
