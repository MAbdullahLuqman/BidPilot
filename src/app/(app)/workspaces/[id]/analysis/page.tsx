"use client";

import { useParams } from "next/navigation";
import { CalendarIcon, FileTextIcon, ShieldAlertIcon } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";
import { useStoredWorkspace } from "@/lib/client-storage";

export default function WorkspaceAnalysisPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const workspace = useStoredWorkspace(user, params.id);

  if (!workspace) return <PageHeader title="Workspace not found" description="No analysis exists for this login/workspace." />;

  return (
    <>
      <PageHeader
        eyebrow={`RFP analysis · ${workspace.id}`}
        title={workspace.title}
        description="These requirements were extracted from the RFP text entered for this workspace."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard icon={FileTextIcon} title="Issuer" value={workspace.issuer || "Not provided"} />
        <InfoCard icon={CalendarIcon} title="Created" value={new Date(workspace.createdAt).toLocaleString()} />
        <InfoCard icon={ShieldAlertIcon} title="Requirements" value={`${workspace.requirements.length} extracted`} />
      </section>

      <Card className="mt-6 rounded-lg border border-border/70 bg-card/55">
        <CardHeader><CardTitle>Extracted requirements</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {workspace.requirements.map((item) => (
            <div key={item.id} className="rounded-lg border border-border/60 bg-background/40 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-emerald-400">{item.id}</span>
                {item.mandatory && <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-300">Mandatory</span>}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{item.requirement}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function InfoCard({ icon: Icon, title, value }: { icon: React.ComponentType<{ className?: string }>; title: string; value: string }) {
  return (
    <Card className="rounded-lg border border-border/70 bg-card/55">
      <CardHeader><Icon className="size-5 text-emerald-400" /><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent><p className="text-sm text-muted-foreground">{value}</p></CardContent>
    </Card>
  );
}
