"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangleIcon, ArrowRightIcon, FileTextIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";
import { ROUTES } from "@/lib/constants";
import { deleteStoredWorkspace, useStoredWorkspaces } from "@/lib/client-storage";

export default function WorkspacesPage() {
  const { user } = useAuth();
  const workspaces = useStoredWorkspaces(user);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function handleDelete(id: string) {
    deleteStoredWorkspace(user, id);
    setConfirmDelete(null);
  }

  const workspaceToDelete = workspaces.find((w) => w.id === confirmDelete);

  return (
    <>
      <PageHeader
        eyebrow="RFP workspaces"
        title="One controlled workspace per tender."
        description="Each workspace is isolated to this login and uses only the RFP text you provide."
        action={
          <Button asChild>
            <Link href={ROUTES.newWorkspace}>
              <PlusIcon />
              New workspace
            </Link>
          </Button>
        }
      />

      {/* Delete confirmation modal */}
      {confirmDelete && workspaceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-red-400/40 bg-card shadow-2xl p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-400/10 p-2.5">
                <AlertTriangleIcon className="size-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Delete workspace?</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  This will permanently delete <span className="font-medium text-foreground">"{workspaceToDelete.title}"</span> and all its associated compliance data, requirements, and proposal drafts.
                </p>
                <p className="mt-2 text-xs text-red-400/80">This action cannot be undone.</p>
              </div>
              <button type="button" onClick={() => setConfirmDelete(null)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(confirmDelete)}>
                <Trash2Icon className="size-3.5" /> Delete workspace
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {workspaces.length === 0 ? (
          <Card className="rounded-lg border border-border/70 bg-card/55">
            <CardHeader>
              <CardTitle>No RFP workspaces yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create a workspace from your own RFP. BidPilot will extract requirements for that RFP only.
              </p>
              <Button asChild className="mt-5">
                <Link href={ROUTES.newWorkspace}>
                  Create first workspace
                  <ArrowRightIcon />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          workspaces.map((workspace) => {
            const pass = workspace.requirements.filter((r) => r.status === "PASS").length;
            const total = workspace.requirements.length;
            const compliance = total ? Math.round((pass / total) * 100) : 0;
            const hasMandatoryFail = workspace.requirements.some(
              (r) => r.mandatory && (r.status === "FAIL" || r.status === "UNKNOWN"),
            );
            return (
              <Card key={workspace.id} className="rounded-lg border border-border/70 bg-card/55">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="leading-tight">{workspace.title}</CardTitle>
                    {hasMandatoryFail && (
                      <span className="shrink-0 rounded-full bg-red-400/10 px-2 py-0.5 text-xs text-red-300 border border-red-400/30">
                        High risk
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                      <FileTextIcon className="mt-1 size-5 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {workspace.issuer || "Issuer not provided"} · {workspace.sector || "No sector"} · {total} requirements
                          {total > 0 && <span className="ml-1 text-emerald-400 font-medium">{compliance}% compliance</span>}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Created {new Date(workspace.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                        onClick={() => setConfirmDelete(workspace.id)}
                      >
                        <Trash2Icon className="size-3.5" />
                        Delete
                      </Button>
                      <Button asChild>
                        <Link href={`/workspaces/${workspace.id}`}>
                          Open workspace
                          <ArrowRightIcon />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </>
  );
}
