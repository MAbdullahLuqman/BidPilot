import { NextResponse } from "next/server";

import { demoCompany, demoProposalSections, demoRequirements } from "@/lib/demo-data";
import { renderPremiumProposalHtml } from "@/lib/premium-proposal-template";
import type { ProposalSection } from "@/lib/premium-proposal-template";

export const runtime = "nodejs";

export async function GET() {
  const sections: ProposalSection[] = demoProposalSections.map((s, i) => ({
    id: `section-${i}`,
    title: s.title,
    html: `<p>${s.content}</p>`,
    confidence: s.confidence,
    evidenceStatus: "REVIEW" as const,
    requirementsCovered: [],
    evidenceUsed: [],
    missingEvidence: [],
    hallucinationRisk: "MEDIUM" as const,
    improvementSuggestion: "",
    approved: false,
  }));

  const html = renderPremiumProposalHtml({
    meta: {
      title: "AI Workflow Platform",
      issuer: "Issuing Authority / Client",
      deadline: "Refer to RFP Instructions",
      version: "v1.0 — Export",
      preparedDate: new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" }),
      sector: demoCompany.sector,
    },
    company: {
      companyName: demoCompany.name,
      sector: demoCompany.sector,
      city: demoCompany.city,
      country: demoCompany.country,
      contactPerson: demoCompany.contact,
      contactEmail: demoCompany.email,
      phone: demoCompany.phone,
      ntn: undefined,
      mainServices: demoCompany.description,
    },
    sections,
    requirements: demoRequirements.map((r) => ({
      id: r.id,
      requirement: r.requirement,
      mandatory: r.mandatory,
      status: r.status,
      evidence: r.evidence,
      action: r.action,
      confidence: r.confidence,
    })),
  });

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": "inline; filename=bidpilot-technical-proposal.html",
    },
  });
}
