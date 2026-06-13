import { NextResponse } from "next/server";
import { z } from "zod";
import * as XLSX from "xlsx";
import type { MatchResult, TrainingDataset } from "@/lib/dataset-store";

export const runtime = "nodejs";

const requestSchema = z.object({
  dataset: z.any(),
  matchResult: z.any().optional(),
  exportType: z.enum(["full", "match", "capabilities", "bid-history"]).default("full"),
});

export async function POST(req: Request) {
  const body = requestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { dataset, matchResult, exportType } = body.data;
  const ds = dataset as TrainingDataset;
  const mr = matchResult as MatchResult | undefined;

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Match Analysis (if available) ─────────────────────────────────
  if (mr && (exportType === "full" || exportType === "match")) {
    const matchRows = [
      ["BidPilot Pakistan — Match Analysis Report"],
      [`Generated: ${new Date().toLocaleString("en-PK")}`],
      [`Dataset: ${mr.datasetFileName}`],
      [],
      ["RFP OVERVIEW"],
      ["Sector", mr.rfpSector],
      ["Domain", mr.rfpDomain],
      ["Predicted Outcome", mr.predictedOutcome],
      ["Predicted Score", mr.predictedScore + "%"],
      ["Win Probability", mr.winProbability + "%"],
      ["Compliance Estimate", mr.complianceEstimate + "%"],
      [],
      ["GROQ ANALYSIS"],
      [mr.groqAnalysis || "Not available"],
      [],
      ["STRENGTHS"],
      ...mr.strengths.map((s) => [s]),
      [],
      ["GAPS"],
      ...mr.gaps.map((g) => [g]),
      [],
      ["RECOMMENDATIONS"],
      ...mr.recommendations.map((r) => [r]),
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(matchRows);
    ws1["!cols"] = [{ wch: 30 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Match Analysis");

    // ── Sheet 2: Matched Capabilities ─────────────────────────────────────────
    if (mr.matchedCapabilities.length > 0) {
      const capHeaders = ["Cap ID", "Domain", "Match Score", "Match Reason", "Certification", "Year Completed", "Contract Value", "Duration (months)", "Client Type", "Project Summary"];
      const capRows = mr.matchedCapabilities.map((c) => [
        c.capId, c.domain, c.matchScore + "%", c.matchReason,
        c.certification, c.yearCompleted, c.contractValue, c.durationMonths, c.clientType, c.projectSummary,
      ]);
      const ws2 = XLSX.utils.aoa_to_sheet([capHeaders, ...capRows]);
      ws2["!cols"] = capHeaders.map((_, i) => ({ wch: [10, 20, 12, 40, 14, 14, 16, 18, 18, 50][i] ?? 15 }));
      XLSX.utils.book_append_sheet(wb, ws2, "Matched Capabilities");
    }

    // ── Sheet 3: Similar Past Bids ─────────────────────────────────────────────
    if (mr.similarBids.length > 0) {
      const bidHeaders = ["Bid ID", "Client", "Sector", "Budget", "Score (%)", "Outcome", "Similarity", "Compliance %", "Gaps Found", "Response Time (hrs)", "Bid Manager", "Submission Date"];
      const bidRows = mr.similarBids.map((b) => [
        b.bidId, b.client, b.sector, b.budget, b.score, b.outcome, b.similarity,
        b.compliancePct, b.gapsFound, b.responseTimeHrs, b.bidManager, b.submissionDate,
      ]);
      const ws3 = XLSX.utils.aoa_to_sheet([bidHeaders, ...bidRows]);
      ws3["!cols"] = bidHeaders.map(() => ({ wch: 16 }));
      XLSX.utils.book_append_sheet(wb, ws3, "Similar Past Bids");
    }
  }

  // ── Sheet: Full Capability Library ────────────────────────────────────────
  if (ds.capabilities?.length > 0 && (exportType === "full" || exportType === "capabilities")) {
    const capHeaders = ["Cap ID", "Domain", "Project Summary", "Certification", "Year Completed", "Contract Value", "Duration (months)", "Client Type"];
    const capRows = ds.capabilities.map((c) => [
      c.capId, c.domain, c.projectSummary, c.certification,
      c.yearCompleted, c.contractValue, c.durationMonths, c.clientType,
    ]);
    const wsCap = XLSX.utils.aoa_to_sheet([
      ["PS1 – Capability Library"],
      [`Company capability library | ${ds.capabilities.length} records`],
      [],
      capHeaders,
      ...capRows,
    ]);
    wsCap["!cols"] = [{ wch: 10 }, { wch: 22 }, { wch: 50 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsCap, "Capability Library");
  }

  // ── Sheet: Full Bid History ────────────────────────────────────────────────
  if (ds.bidHistory?.length > 0 && (exportType === "full" || exportType === "bid-history")) {
    const wins = ds.bidHistory.filter((b) => b.outcome === "Win").length;
    const avgScore = Math.round(ds.bidHistory.reduce((s, b) => s + b.score, 0) / ds.bidHistory.length);
    const bidHeaders = ["Bid ID", "Client", "Sector", "Budget", "Score (%)", "Outcome", "Response Time (hrs)", "Compliance %", "Doc Pages", "Gaps Found", "Bid Manager", "Submission Date"];
    const bidRows = ds.bidHistory.map((b) => [
      b.bidId, b.client, b.sector, b.budget, b.score, b.outcome,
      b.responseTimeHrs, b.compliancePct, b.docPages, b.gapsFound, b.bidManager, b.submissionDate,
    ]);
    const wsBid = XLSX.utils.aoa_to_sheet([
      ["PS1 – Bid History Dataset"],
      [`Historical bid outcomes | ${ds.bidHistory.length} records | Win rate: ${Math.round((wins / ds.bidHistory.length) * 100)}% | Avg score: ${avgScore}%`],
      [],
      bidHeaders,
      ...bidRows,
    ]);
    wsBid["!cols"] = bidHeaders.map(() => ({ wch: 16 }));
    XLSX.utils.book_append_sheet(wb, wsBid, "Bid History");
  }

  // ── Sheet: Dataset Summary ────────────────────────────────────────────────
  {
    const summaryRows = [
      ["BidPilot Pakistan — Training Dataset Summary"],
      [`File: ${ds.fileName}`],
      [`Imported: ${ds.importedAt}`],
      [`Indexed: ${ds.indexedAt ?? "Not indexed"}`],
      [],
      ["STATISTICS"],
      ["Total capabilities", ds.capabilities?.length ?? 0],
      ["Total bid records", ds.bidHistory?.length ?? 0],
      ["Overall win rate", (ds.winRate ?? 0) + "%"],
      [],
      ["DOMAINS COVERED"],
      ...(ds.domainIndex ?? []).map((d) => [d]),
      [],
      ["SECTORS COVERED"],
      ...(ds.sectorIndex ?? []).map((s) => [s]),
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary["!cols"] = [{ wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
  }

  const xlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const fileName = `bidpilot-${ds.fileName.replace(/\.[^.]+$/, "")}-export.xlsx`;

  return new Response(xlsxBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
