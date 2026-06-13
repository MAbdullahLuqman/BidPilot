"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";
import { ROUTES } from "@/lib/constants";
import { useStoredCompany } from "@/lib/client-storage";

export default function CapabilityLibraryPage() {
  const { user } = useAuth();
  const company = useStoredCompany(user);
  const capabilities = company?.capabilities ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Capabilities"
        title={company?.companyName ? `${company.companyName} capabilities` : "No company capability library yet"}
        description="Capabilities are isolated per login and generated from the current company profile."
        action={
          <Button asChild>
            <Link href={ROUTES.companyProfile}>
              <PlusIcon />
              Analyze company
            </Link>
          </Button>
        }
      />

      {capabilities.length === 0 ? (
        <Card className="rounded-lg border border-border/70 bg-card/55">
          <CardHeader><CardTitle>No capabilities extracted</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Save company settings, then open Website Analyzer and click Analyze. Demo capabilities from other accounts will not appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {capabilities.map((capability) => (
            <Card key={capability.title} className="rounded-lg border border-border/70 bg-card/55">
              <CardHeader><CardTitle>{capability.title}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{capability.evidence}</p>
                <div className="flex flex-wrap gap-2">
                  {capability.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{capability.type}</span>
                  <span>{Math.round(capability.confidence * 100)}% confidence</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
