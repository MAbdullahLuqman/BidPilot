"use client";

import Link from "next/link";
import { GlobeIcon, ScanSearchIcon, SparklesIcon } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";
import { ROUTES } from "@/lib/constants";
import {
  inferCapabilities,
  saveStoredCompany,
  useStoredCompany,
} from "@/lib/client-storage";

export default function CompanyProfilePage() {
  const { user } = useAuth();
  const company = useStoredCompany(user);
  const capabilities = company?.capabilities ?? [];

  function analyzeCompany() {
    if (!company) return;
    const nextCapabilities = inferCapabilities(company);
    const nextCompany = { ...company, capabilities: nextCapabilities };
    saveStoredCompany(user, nextCompany);
  }

  if (!company?.companyName) {
    return (
      <>
        <PageHeader
          eyebrow="Company intelligence"
          title="Add a company before analysis."
          description="No company profile is saved for this login yet. Add the real bidder details and website first."
          action={
            <Button asChild>
              <Link href={ROUTES.companySettings}>Open company settings</Link>
            </Button>
          }
        />
        <EmptyCard />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Company intelligence"
        title="Website analysis and evidence extraction."
        description="Analyze the saved company profile to build a capability library for this bidder only."
        action={
          <Button onClick={analyzeCompany}>
            <ScanSearchIcon />
            Analyze {company.websiteUrl ? "website/profile" : "profile"}
          </Button>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-lg border border-border/70 bg-card/55">
          <CardHeader>
            <CardTitle>{company.companyName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{company.description || "No company description provided yet."}</p>
            <div className="rounded-lg border border-border/60 bg-background/40 p-4">
              <div className="flex items-center gap-2 text-foreground">
                <GlobeIcon className="size-4 text-emerald-400" />
                {company.websiteUrl || "No website URL provided"}
              </div>
              <p className="mt-2">
                {company.city || "City missing"}, {company.country || "Country missing"} · {company.sector}
              </p>
              <p className="mt-2">Category: {company.category}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-border/70 bg-card/55">
          <CardHeader>
            <CardTitle>Extracted capability profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {capabilities.length === 0 ? (
              <p className="text-sm text-muted-foreground md:col-span-2">
                No capabilities extracted yet. Click Analyze to build this company’s capability profile.
              </p>
            ) : (
              capabilities.map((capability) => (
                <div key={capability.title} className="rounded-lg border border-border/60 bg-background/40 p-4">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="size-4 text-emerald-400" />
                    <p className="font-medium">{capability.title}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{capability.evidence}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Confidence {Math.round(capability.confidence * 100)}%
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function EmptyCard() {
  return (
    <Card className="rounded-lg border border-border/70 bg-card/55">
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This prevents Klarai or any other demo company from leaking into new accounts.
        </p>
      </CardContent>
    </Card>
  );
}
