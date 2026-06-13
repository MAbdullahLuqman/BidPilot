import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings"
        description="Keep this lean for the hackathon: account basics, Firebase status, and AI provider readiness."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Firebase Auth", "Configured for email/password login."],
          ["Firestore", "Server profile writes use Firebase Admin when network access is available."],
          ["AI Provider", "Provider abstraction is planned; add API key before AI milestones."],
        ].map(([title, body]) => (
          <Card key={title} className="rounded-lg border border-border/70 bg-card/55">
            <CardHeader>
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
