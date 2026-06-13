import { NextResponse } from "next/server";
import { z } from "zod";
import { callGroq } from "@/lib/ai/groq";
import type { BidRecord, CapabilityRecord, MatchResult, TrainingDataset } from "@/lib/dataset-store";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  rfpText: z.string().min(20),
  rfpTitle: z.string().default(""),
  rfpSector: z.string().default(""),
  rfpBudget: z.string().default(""),
  rfpClientType: z.string().default(""),
  dataset: z.object({
    id: z.string(),
    fileName: z.string(),
    bidHistory: z.array(z.any()),
    capabilities: z.array(z.any()),
    domainIndex: z.array(z.string()).optional(),
    sectorIndex: z.array(z.string()).optional(),
    winRate: z.number().optional(),
  }),
});

function safeJson<T>(raw: string): T | null {
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]) as T; } catch { return null; }
    }
    return null;
  }
}

export async function POST(req: Request) {
  const body = requestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { rfpText, rfpTitle, rfpSector, rfpBudget, rfpClientType, dataset } = body.data;
  const bidHistory = dataset.bidHistory as BidRecord[];
  const capabilities = dataset.capabilities as CapabilityRecord[];

  // ── Step 1: Groq — extract RFP metadata if not provided ──────────────────
  let sector = rfpSector;
  let domain = "";

  if (!sector) {
    try {
      const metaRaw = await callGroq([
        { role: "system", content: "Extract metadata from this RFP as JSON only. Output: {\"sector\": string, \"domain\": string, \"clientType\": string, \"budget\": string}" },
        { role: "user", content: rfpText.slice(0, 3000) },
      ], { temperature: 0.05 });
      const meta = safeJson<{ sector?: string; domain?: string }>(metaRaw);
      sector = meta?.sector ?? sector;
      domain = meta?.domain ?? "";
    } catch { /* use provided values */ }
  }

  // ── Step 2: Score capabilities against RFP ────────────────────────────────
  const capSummary = capabilities.slice(0, 30).map((c) =>
    `${c.capId} | ${c.domain} | ${c.certification} | ${c.yearCompleted} | ${c.contractValue} | ${c.clientType}`,
  ).join("\n");

  type CapMatchRaw = { capId: string; matchScore: number; matchReason: string };

  let capMatches: CapMatchRaw[] = [];
  try {
    const capRaw = await callGroq([
      {
        role: "system",
        content: "You are a bid analyst. Score each capability against the RFP. Return JSON array only: [{\"capId\": \"CAP-xxx\", \"matchScore\": 0-100, \"matchReason\": \"1 sentence\"}]. Only include capabilities with matchScore >= 40. Max 10 results.",
      },
      {
        role: "user",
        content: `RFP title: ${rfpTitle || "Not specified"}
Sector: ${sector}
Domain: ${domain}
Budget: ${rfpBudget || "Not specified"}
Client type: ${rfpClientType || "Not specified"}

RFP excerpt:
${rfpText.slice(0, 4000)}

Company capabilities:
${capSummary}`,
      },
    ], { temperature: 0.1 });

    const parsed = safeJson<CapMatchRaw[]>(capRaw);
    if (Array.isArray(parsed)) capMatches = parsed;
  } catch { /* continue */ }

  const matchedCapabilities = capMatches
    .map((m) => {
      const cap = capabilities.find((c) => c.capId === m.capId);
      if (!cap) return null;
      return { ...cap, matchScore: m.matchScore, matchReason: m.matchReason };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => b.matchScore - a.matchScore);

  // ── Step 3: Find similar bids from history ────────────────────────────────
  const sectorBids = bidHistory.filter((b) =>
    b.sector.toLowerCase() === sector.toLowerCase() ||
    (sector && b.sector.toLowerCase().includes(sector.toLowerCase().split(" ")[0] ?? "")),
  ).slice(0, 20);

  const bidSummary = sectorBids.map((b) =>
    `${b.bidId} | ${b.client} | ${b.sector} | ${b.budget} | Score:${b.score} | ${b.outcome} | Compliance:${b.compliancePct}% | Gaps:${b.gapsFound}`,
  ).join("\n") || bidHistory.slice(0, 15).map((b) =>
    `${b.bidId} | ${b.client} | ${b.sector} | ${b.budget} | Score:${b.score} | ${b.outcome} | Compliance:${b.compliancePct}% | Gaps:${b.gapsFound}`,
  ).join("\n");

  type BidMatchRaw = { bidId: string; similarity: string; predictedOutcome: string; reasoning: string };

  let bidMatches: BidMatchRaw[] = [];
  let groqAnalysis = "";
  try {
    const analysisRaw = await callGroq([
      {
        role: "system",
        content: `You are a bid intelligence analyst trained on Pakistani tender data. Given an RFP and historical bid data, provide:
1. Which past bids are most similar (by sector, budget range, client type)
2. Predicted outcome and win probability
3. Key strengths and gaps
4. Specific recommendations

Return strict JSON:
{
  "similarBids": [{"bidId": "BID-xxxx", "similarity": "High/Medium/Low", "reasoning": "1 sentence"}],
  "predictedOutcome": "Win|Loss|Uncertain",
  "predictedScore": 0-100,
  "winProbability": 0-100,
  "complianceEstimate": 0-100,
  "strengths": ["string"],
  "gaps": ["string"],
  "recommendations": ["string"],
  "analysis": "2-3 sentence strategic summary"
}`,
      },
      {
        role: "user",
        content: `RFP: ${rfpTitle || "Tender"}
Sector: ${sector} | Domain: ${domain} | Budget: ${rfpBudget} | Client: ${rfpClientType}

RFP text:
${rfpText.slice(0, 5000)}

Historical bids in this sector / nearest matches:
${bidSummary}

Company overall win rate: ${dataset.winRate ?? 0}%
Matched capabilities: ${matchedCapabilities.length} (top domains: ${matchedCapabilities.slice(0, 3).map((c) => c.domain).join(", ")})`,
      },
    ], { temperature: 0.15 });

    const parsed = safeJson<{
      similarBids?: BidMatchRaw[];
      predictedOutcome?: string;
      predictedScore?: number;
      winProbability?: number;
      complianceEstimate?: number;
      strengths?: string[];
      gaps?: string[];
      recommendations?: string[];
      analysis?: string;
    }>(analysisRaw);

    if (parsed) {
      bidMatches = parsed.similarBids ?? [];
      groqAnalysis = parsed.analysis ?? "";

      const similarBids = bidMatches
        .map((m) => {
          const bid = bidHistory.find((b) => b.bidId === m.bidId);
          if (!bid) return null;
          return { ...bid, similarity: m.similarity };
        })
        .filter((b): b is NonNullable<typeof b> => b !== null);

      const result: MatchResult = {
        datasetId: dataset.id,
        datasetFileName: dataset.fileName,
        rfpSector: sector,
        rfpDomain: domain,
        matchedCapabilities,
        similarBids,
        predictedOutcome: (parsed.predictedOutcome as MatchResult["predictedOutcome"]) ?? "Uncertain",
        predictedScore: parsed.predictedScore ?? 0,
        winProbability: parsed.winProbability ?? 0,
        complianceEstimate: parsed.complianceEstimate ?? 0,
        gaps: parsed.gaps ?? [],
        strengths: parsed.strengths ?? [],
        recommendations: parsed.recommendations ?? [],
        groqAnalysis,
        generatedAt: new Date().toISOString(),
      };

      return NextResponse.json({ result });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Match failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Fallback if Groq parse failed
  const fallbackResult: MatchResult = {
    datasetId: dataset.id,
    datasetFileName: dataset.fileName,
    rfpSector: sector,
    rfpDomain: domain,
    matchedCapabilities,
    similarBids: sectorBids.slice(0, 5).map((b) => ({ ...b, similarity: "Medium" })),
    predictedOutcome: "Uncertain",
    predictedScore: 50,
    winProbability: dataset.winRate ?? 50,
    complianceEstimate: 60,
    gaps: ["Full Groq analysis could not be parsed. Review manually."],
    strengths: matchedCapabilities.slice(0, 3).map((c) => c.domain),
    recommendations: ["Regenerate match for full AI analysis."],
    groqAnalysis: "",
    generatedAt: new Date().toISOString(),
  };

  return NextResponse.json({ result: fallbackResult });
}
