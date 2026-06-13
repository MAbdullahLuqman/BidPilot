"use client";

import { useParams } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { ProposalEditor } from "@/components/proposal/proposal-editor";
import { useAuth } from "@/components/auth/auth-provider";
import { useStoredCompany, useStoredWorkspace } from "@/lib/client-storage";

export default function ProposalPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const workspace = useStoredWorkspace(user, params.id);
  const company = useStoredCompany(user);

  if (!workspace) return <PageHeader title="Workspace not found" description="No proposal exists for this login/workspace." />;

  return (
    <>
      <PageHeader
        eyebrow={`Proposal · ${workspace.id}`}
        title="Word-level technical proposal editor"
        description="Edit the generated proposal directly, keep every claim tied to RFP/company evidence, and print the final document as a PDF."
      />

      <ProposalEditor user={user} workspace={workspace} company={company} />
    </>
  );
}
