import Link from "next/link";
import { ExternalLinkIcon, FileSearchIcon, LandmarkIcon, UploadCloudIcon } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";

const portals = [
  {
    title: "EPADS Pakistan",
    description: "Official e-procurement portal used for public procurement notices and bidding workflows.",
    href: "https://eprocure.gov.pk/",
  },
  {
    title: "PPRA Pakistan",
    description: "Public Procurement Regulatory Authority portal for procurement rules, notices, and standard bidding documents.",
    href: "https://www.ppra.org.pk/",
  },
] as const;

export default function GovernmentRfpsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Government RFP discovery"
        title="Find public-sector tenders, then bring the RFP into BidPilot."
        description="EPADS does not expose a simple public API for this MVP. The practical workflow is to open the official portal, download a tender/RFP, then upload or paste it into a BidPilot workspace."
        action={
          <Button asChild>
            <Link href={ROUTES.newWorkspace}>
              <UploadCloudIcon />
              Upload RFP
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-2">
        {portals.map((portal) => (
          <Card key={portal.title} className="rounded-lg border border-border/70 bg-card/55">
            <CardHeader>
              <div className="flex items-center gap-2">
                <LandmarkIcon className="size-5 text-emerald-400" />
                <CardTitle>{portal.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{portal.description}</p>
              <Button asChild className="mt-5" variant="secondary">
                <a href={portal.href} target="_blank" rel="noreferrer">
                  Open portal
                  <ExternalLinkIcon />
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="mt-6 rounded-lg border border-border/70 bg-card/55">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSearchIcon className="size-5 text-emerald-400" />
            <CardTitle>BidPilot import workflow</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 text-sm text-muted-foreground md:grid-cols-4">
            <li className="rounded-lg border border-border/60 bg-background/40 p-4">1. Open EPADS / PPRA and search by sector or procuring agency.</li>
            <li className="rounded-lg border border-border/60 bg-background/40 p-4">2. Download the RFP, TOR, corrigendum, or bidding document.</li>
            <li className="rounded-lg border border-border/60 bg-background/40 p-4">3. Create a workspace and upload the file or paste the tender text.</li>
            <li className="rounded-lg border border-border/60 bg-background/40 p-4">4. Run analysis, compliance matching, proposal generation, and win score.</li>
          </ol>
        </CardContent>
      </Card>
    </>
  );
}
