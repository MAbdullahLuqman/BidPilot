"use client";

import { useState } from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

const defaultRfp =
  "The bidder must submit a technical proposal for a road/highway infrastructure assignment. The proposal must include project understanding, design methodology, surveys, implementation plan, quality assurance, staffing, compliance matrix, schedule, and evidence of relevant experience.";

const defaultEvidence =
  "Company has experience in technical assistance, feasibility studies, road/highway engineering, project management, data collection, traffic surveys, and preparation of technical documentation. Missing evidence must be flagged rather than invented.";

export function ProposalGeneratorPanel() {
  const [rfpText, setRfpText] = useState(defaultRfp);
  const [companyEvidence, setCompanyEvidence] = useState(defaultEvidence);
  const [proposal, setProposal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/proposal/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyName: "Associated Consultancy Centre / Demo Bidder",
          companyCategory: "construction",
          rfpText,
          companyEvidence,
        }),
      });
      const data = (await res.json()) as { proposal?: string; error?: string };
      if (!res.ok || !data.proposal) {
        throw new Error(data.error ?? "Proposal generation failed.");
      }
      setProposal(data.proposal);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Proposal generation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-border/70 bg-card/55 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-heading text-lg font-medium">Groq construction proposal generator</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Uses a construction-grade proposal structure based on the two reference DOCX documents.
          </p>
        </div>
        <Button onClick={generate} disabled={loading}>
          {loading ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          Generate with Groq
        </Button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">RFP / tender text</span>
          <textarea
            value={rfpText}
            onChange={(event) => setRfpText(event.target.value)}
            rows={7}
            className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Company evidence</span>
          <textarea
            value={companyEvidence}
            onChange={(event) => setCompanyEvidence(event.target.value)}
            rows={7}
            className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </label>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {proposal && (
        <div className="mt-5 rounded-lg border border-border/60 bg-background/60 p-5">
          <pre className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{proposal}</pre>
        </div>
      )}
    </section>
  );
}
