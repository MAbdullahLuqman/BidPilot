import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import type { BidRecord, CapabilityRecord, TrainingDataset } from "@/lib/dataset-store";

export const runtime = "nodejs";
export const maxDuration = 30;

function parseNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v.replace(/[^0-9.-]/g, "")) || 0;
  return 0;
}

function parseStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = (file as File).name ?? "dataset.xlsx";

    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

    // ── Find Bid History sheet ────────────────────────────────────────────────
    const bidSheetName = workbook.SheetNames.find((n) =>
      /bid.?hist/i.test(n) || /history/i.test(n),
    );

    // ── Find Capability Library sheet ─────────────────────────────────────────
    const capSheetName = workbook.SheetNames.find((n) =>
      /capabilit/i.test(n) || /library/i.test(n),
    );

    if (!bidSheetName && !capSheetName) {
      return NextResponse.json(
        { error: `No recognisable sheets found. Expected sheets containing 'Bid History' or 'Capability Library'. Found: ${workbook.SheetNames.join(", ")}` },
        { status: 422 },
      );
    }

    // ── Parse Bid History ─────────────────────────────────────────────────────
    const bidHistory: BidRecord[] = [];
    if (bidSheetName) {
      const sheet = workbook.Sheets[bidSheetName];
      // Convert to array of arrays so we can handle merged header rows
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" }) as unknown[][];

      // Find the actual header row (contains "Bid ID")
      let headerRowIdx = rows.findIndex((r) =>
        Array.isArray(r) && r.some((c) => String(c).trim().toLowerCase() === "bid id"),
      );
      if (headerRowIdx === -1) headerRowIdx = 0;

      const headers = (rows[headerRowIdx] as string[]).map((h) => String(h).trim().toLowerCase());

      const col = (row: unknown[], name: string) => {
        const idx = headers.findIndex((h) => h.includes(name));
        return idx >= 0 ? row[idx] : "";
      };

      for (const row of rows.slice(headerRowIdx + 1)) {
        const bidId = parseStr(col(row as unknown[], "bid id"));
        if (!bidId || !/^bid/i.test(bidId)) continue; // skip empty / title rows
        bidHistory.push({
          bidId,
          client: parseStr(col(row as unknown[], "client")),
          sector: parseStr(col(row as unknown[], "sector")),
          budget: parseStr(col(row as unknown[], "budget")),
          score: parseNum(col(row as unknown[], "score")),
          outcome: parseStr(col(row as unknown[], "outcome")) === "Win" ? "Win" : "Loss",
          responseTimeHrs: parseNum(col(row as unknown[], "response")),
          compliancePct: parseNum(col(row as unknown[], "compliance")),
          docPages: parseNum(col(row as unknown[], "doc")),
          gapsFound: parseNum(col(row as unknown[], "gap")),
          bidManager: parseStr(col(row as unknown[], "bid manager")),
          submissionDate: parseStr(col(row as unknown[], "submission")),
        });
      }
    }

    // ── Parse Capability Library ──────────────────────────────────────────────
    const capabilities: CapabilityRecord[] = [];
    if (capSheetName) {
      const sheet = workbook.Sheets[capSheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" }) as unknown[][];

      let headerRowIdx = rows.findIndex((r) =>
        Array.isArray(r) && r.some((c) => /cap.?id/i.test(String(c))),
      );
      if (headerRowIdx === -1) headerRowIdx = 0;

      const headers = (rows[headerRowIdx] as string[]).map((h) => String(h).trim().toLowerCase());

      const col = (row: unknown[], name: string) => {
        const idx = headers.findIndex((h) => h.includes(name));
        return idx >= 0 ? row[idx] : "";
      };

      for (const row of rows.slice(headerRowIdx + 1)) {
        const capId = parseStr(col(row as unknown[], "cap"));
        if (!capId || !/^cap/i.test(capId)) continue;
        capabilities.push({
          capId,
          domain: parseStr(col(row as unknown[], "domain")),
          projectSummary: parseStr(col(row as unknown[], "project")),
          certification: parseStr(col(row as unknown[], "cert")),
          yearCompleted: parseNum(col(row as unknown[], "year")),
          contractValue: parseStr(col(row as unknown[], "contract")),
          durationMonths: parseNum(col(row as unknown[], "duration")),
          clientType: parseStr(col(row as unknown[], "client")),
        });
      }
    }

    // ── Build computed indexes ────────────────────────────────────────────────
    const domainIndex = [...new Set(capabilities.map((c) => c.domain).filter(Boolean))];
    const sectorIndex = [...new Set(bidHistory.map((b) => b.sector).filter(Boolean))];
    const wins = bidHistory.filter((b) => b.outcome === "Win").length;
    const winRate = bidHistory.length ? Math.round((wins / bidHistory.length) * 100) : 0;

    const dataset: TrainingDataset = {
      id: `ds-${Date.now()}`,
      fileName,
      importedAt: new Date().toISOString(),
      bidHistory,
      capabilities,
      domainIndex,
      sectorIndex,
      winRate,
      indexedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      dataset,
      summary: {
        fileName,
        bidCount: bidHistory.length,
        capabilityCount: capabilities.length,
        domains: domainIndex,
        sectors: sectorIndex,
        winRate,
        sheets: workbook.SheetNames,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
