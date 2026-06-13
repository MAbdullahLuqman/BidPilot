"use client";

import { useRef, useState } from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  DatabaseIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  Loader2Icon,
  SparklesIcon,
  Trash2Icon,
  UploadCloudIcon,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";
import { useStoredWorkspaces } from "@/lib/client-storage";
import {
  deleteDataset,
  saveDataset,
  saveWorkspaceMatchResult,
  useStoredDatasets,
  type MatchResult,
  type TrainingDataset,
} from "@/lib/dataset-store";

function pct(n: number) { return `${Math.round(n)}%`; }
function outcomeColor(o: string) {
  if (o === "Win") return "text-emerald-400";
  if (o === "Loss") return "text-red-400";
  return "text-amber-400";
}
function scoreColor(n: number) {
  if (n >= 70) return "text-emerald-400";
  if (n >= 50) return "text-amber-400";
  return "text-red-400";
}

export default function CapabilityLibraryPage() {
  const { user } = useAuth();
  const datasets = useStoredDatasets(user);
  const workspaces = useStoredWorkspaces(user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [matchResults, setMatchResults] = useState<Record<string, MatchResult>>({});
  const [matchError, setMatchError] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError(null);
    setImportSuccess(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/datasets/import", { method: "POST", body: form });
      const data = (await res.json()) as { dataset?: TrainingDataset; summary?: Record<string, unknown>; error?: string };
      if (!res.ok || !data.dataset) throw new Error(data.error ?? "Import failed");
      saveDataset(user, data.dataset);
      setImportSuccess(
        `Imported "${file.name}" — ${data.summary?.bidCount as number} bids · ${data.summary?.capabilityCount as number} capabilities · Win rate ${data.summary?.winRate as number}%`,
      );
      setExpandedId(data.dataset.id);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function runMatch(dataset: TrainingDataset) {
    const ws = workspaces.find((w) => w.id === selectedWorkspaceId);
    if (!ws) { setMatchError("Select a workspace (RFP) to match against."); return; }
    setMatchingId(dataset.id);
    setMatchError(null);
    try {
      const res = await fetch("/api/datasets/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rfpText: ws.rfpText,
          rfpTitle: ws.title,
          rfpSector: ws.sector,
          dataset: {
            id: dataset.id,
            fileName: dataset.fileName,
            bidHistory: dataset.bidHistory,
            capabilities: dataset.capabilities,
            domainIndex: dataset.domainIndex,
            sectorIndex: dataset.sectorIndex,
            winRate: dataset.winRate,
          },
        }),
      });
      const data = (await res.json()) as { result?: MatchResult; error?: string };
      if (!res.ok || !data.result) throw new Error(data.error ?? "Match failed");
      setMatchResults((prev) => ({ ...prev, [dataset.id]: data.result! }));
      saveWorkspaceMatchResult(user, ws.id, data.result);
      setExpandedId(dataset.id);
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : "Match failed");
    } finally {
      setMatchingId(null);
    }
  }

  async function exportDataset(dataset: TrainingDataset, type: "full" | "match" | "capabilities" | "bid-history") {
    setExportingId(dataset.id);
    try {
      const res = await fetch("/api/datasets/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dataset, matchResult: matchResults[dataset.id] ?? null, exportType: type }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bidpilot-${dataset.fileName.replace(/\.[^.]+$/, "")}-${type}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExportingId(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Training Datasets"
        title="Company capability library & bid history"
        description="Import Excel datasets to train the company profile. Use Groq AI to match any RFP against historical bids and capabilities, then export the results as Excel."
      />

      {/* Import card */}
      <Card className="rounded-lg border border-border/70 bg-card/55 mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadCloudIcon className="size-5" /> Import training dataset (Excel)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload any <strong>.xlsx</strong> file that contains a <em>Bid History</em> sheet and / or a <em>Capability Library</em> sheet.
            Column headers are auto-detected — you can add more datasets at any time and future formats will be supported.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => fileInputRef.current?.click()} disabled={importing}>
              {importing ? <Loader2Icon className="animate-spin" /> : <FileSpreadsheetIcon />}
              {importing ? "Importing…" : "Choose Excel file (.xlsx / .xls)"}
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
            <span className="text-xs text-muted-foreground">Supports .xlsx · .xls · .csv</span>
          </div>
          {importSuccess && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">
              <CheckCircle2Icon className="size-4 shrink-0" />{importSuccess}
            </div>
          )}
          {importError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
              <AlertTriangleIcon className="size-4 shrink-0" />{importError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workspace picker for Groq matching */}
      {datasets.length > 0 && workspaces.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border/70 bg-card/55 px-4 py-3">
          <SparklesIcon className="size-4 text-violet-400 shrink-0" />
          <span className="text-sm text-muted-foreground shrink-0">Match against RFP workspace:</span>
          <select
            value={selectedWorkspaceId}
            onChange={(e) => setSelectedWorkspaceId(e.target.value)}
            className="flex-1 min-w-[220px] rounded-md border border-input bg-input/30 px-3 py-1.5 text-sm outline-none focus:border-ring"
          >
            <option value="">— select workspace —</option>
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>{ws.title} · {ws.sector}</option>
            ))}
          </select>
          {matchError && <span className="text-xs text-red-400">{matchError}</span>}
        </div>
      )}

      {/* Empty state */}
      {datasets.length === 0 && (
        <Card className="rounded-lg border border-border/70 bg-card/55">
          <CardContent className="py-16 text-center">
            <DatabaseIcon className="mx-auto size-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No datasets imported yet. Upload an Excel file above to get started.</p>
          </CardContent>
        </Card>
      )}

      {/* Dataset cards */}
      <div className="space-y-4">
        {datasets.map((ds) => {
          const expanded = expandedId === ds.id;
          const mr = matchResults[ds.id];

          return (
            <Card key={ds.id} className="rounded-lg border border-border/70 bg-card/55">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileSpreadsheetIcon className="size-5 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{ds.fileName}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Imported {new Date(ds.importedAt).toLocaleDateString("en-PK")} ·{" "}
                        {ds.bidHistory.length} bids · {ds.capabilities.length} capabilities ·{" "}
                        <span className="text-emerald-400 font-medium">{ds.winRate}% win rate</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-700 text-white"
                      disabled={matchingId === ds.id || !selectedWorkspaceId}
                      title={!selectedWorkspaceId ? "Select a workspace first" : ""}
                      onClick={() => runMatch(ds)}
                    >
                      {matchingId === ds.id
                        ? <><Loader2Icon className="animate-spin" />Matching…</>
                        : <><SparklesIcon />Match with Groq</>}
                    </Button>
                    <Button size="sm" variant="secondary" disabled={exportingId === ds.id} onClick={() => exportDataset(ds, "full")}>
                      {exportingId === ds.id ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
                      Export Excel
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setExpandedId(expanded ? null : ds.id)}>
                      {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteDataset(user, ds.id)}>
                      <Trash2Icon />
                    </Button>
                  </div>
                </div>

                {/* Domain / sector tags */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {ds.domainIndex?.map((d) => (
                    <span key={d} className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[10px] text-sky-300">{d}</span>
                  ))}
                  {ds.sectorIndex?.map((s) => (
                    <span key={s} className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[10px] text-violet-300">{s}</span>
                  ))}
                </div>
              </CardHeader>

              {expanded && (
                <CardContent className="space-y-6 pt-0">

                  {/* Groq Match Result */}
                  {mr && (
                    <div className="rounded-lg border border-violet-400/30 bg-violet-400/5 p-4 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-violet-300 flex items-center gap-2">
                          <SparklesIcon className="size-4" /> Groq Match Analysis
                          <span className="text-xs font-normal text-muted-foreground">— {mr.rfpSector} / {mr.rfpDomain}</span>
                        </p>
                        <Button size="sm" variant="secondary" disabled={exportingId === ds.id} onClick={() => exportDataset(ds, "match")}>
                          <DownloadIcon className="size-3" /> Export match report
                        </Button>
                      </div>

                      {/* KPIs */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: "Predicted outcome", value: mr.predictedOutcome, color: outcomeColor(mr.predictedOutcome) },
                          { label: "Predicted score",   value: pct(mr.predictedScore),   color: scoreColor(mr.predictedScore) },
                          { label: "Win probability",   value: pct(mr.winProbability),   color: scoreColor(mr.winProbability) },
                          { label: "Compliance est.",   value: pct(mr.complianceEstimate), color: scoreColor(mr.complianceEstimate) },
                        ].map((kpi) => (
                          <div key={kpi.label} className="rounded-lg border border-border/60 bg-background/40 p-3 text-center">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{kpi.label}</p>
                            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                          </div>
                        ))}
                      </div>

                      {mr.groqAnalysis && (
                        <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-violet-400/40 pl-3 italic">{mr.groqAnalysis}</p>
                      )}

                      <div className="grid md:grid-cols-3 gap-4">
                        {mr.strengths.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">Strengths</p>
                            <ul className="space-y-1">
                              {mr.strengths.map((s, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                  <CheckCircle2Icon className="size-3 mt-0.5 shrink-0 text-emerald-400" />{s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {mr.gaps.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-2">Gaps</p>
                            <ul className="space-y-1">
                              {mr.gaps.map((g, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                  <AlertTriangleIcon className="size-3 mt-0.5 shrink-0 text-red-400" />{g}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {mr.recommendations.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-sky-400 mb-2">Recommendations</p>
                            <ul className="space-y-1">
                              {mr.recommendations.map((r, i) => (
                                <li key={i} className="text-xs text-muted-foreground">• {r}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Matched capabilities table */}
                      {mr.matchedCapabilities.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                            Matched capabilities ({mr.matchedCapabilities.length})
                          </p>
                          <div className="overflow-x-auto rounded-lg border border-border/60">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-border/60 bg-muted/40">
                                  {["Cap ID", "Domain", "Score", "Cert", "Year", "Value", "Match reason"].map((h) => (
                                    <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {mr.matchedCapabilities.map((c) => (
                                  <tr key={c.capId} className="border-b border-border/40 hover:bg-muted/20">
                                    <td className="px-3 py-2 font-mono text-[10px]">{c.capId}</td>
                                    <td className="px-3 py-2 font-medium">{c.domain}</td>
                                    <td className={`px-3 py-2 font-bold ${scoreColor(c.matchScore)}`}>{c.matchScore}%</td>
                                    <td className="px-3 py-2 text-muted-foreground">{c.certification}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{c.yearCompleted}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{c.contractValue}</td>
                                    <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate">{c.matchReason}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Similar bids table */}
                      {mr.similarBids.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                            Similar past bids ({mr.similarBids.length})
                          </p>
                          <div className="overflow-x-auto rounded-lg border border-border/60">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-border/60 bg-muted/40">
                                  {["Bid ID", "Client", "Sector", "Budget", "Score", "Outcome", "Similarity", "Compliance"].map((h) => (
                                    <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {mr.similarBids.map((b) => (
                                  <tr key={b.bidId} className="border-b border-border/40 hover:bg-muted/20">
                                    <td className="px-3 py-2 font-mono text-[10px]">{b.bidId}</td>
                                    <td className="px-3 py-2">{b.client}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{b.sector}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{b.budget}</td>
                                    <td className={`px-3 py-2 font-bold ${scoreColor(b.score)}`}>{b.score}%</td>
                                    <td className={`px-3 py-2 font-semibold ${outcomeColor(b.outcome)}`}>{b.outcome}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{b.similarity}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{b.compliancePct}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Raw data preview */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Capabilities ({ds.capabilities.length})</p>
                        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => exportDataset(ds, "capabilities")}>
                          <DownloadIcon className="size-3" /> Export
                        </Button>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-border/60 max-h-56 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                            <tr>
                              {["ID", "Domain", "Cert", "Year", "Value", "Client Type"].map((h) => (
                                <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground border-b border-border/60">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {ds.capabilities.map((c) => (
                              <tr key={c.capId} className="border-b border-border/30 hover:bg-muted/20">
                                <td className="px-2 py-1.5 font-mono text-[10px]">{c.capId}</td>
                                <td className="px-2 py-1.5 font-medium">{c.domain}</td>
                                <td className="px-2 py-1.5 text-muted-foreground">{c.certification}</td>
                                <td className="px-2 py-1.5 text-muted-foreground">{c.yearCompleted}</td>
                                <td className="px-2 py-1.5 text-muted-foreground">{c.contractValue}</td>
                                <td className="px-2 py-1.5 text-muted-foreground">{c.clientType}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bid history ({ds.bidHistory.length})</p>
                        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => exportDataset(ds, "bid-history")}>
                          <DownloadIcon className="size-3" /> Export
                        </Button>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-border/60 max-h-56 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                            <tr>
                              {["Bid ID", "Client", "Sector", "Budget", "Score", "Outcome", "Compliance"].map((h) => (
                                <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground border-b border-border/60">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {ds.bidHistory.map((b) => (
                              <tr key={b.bidId} className="border-b border-border/30 hover:bg-muted/20">
                                <td className="px-2 py-1.5 font-mono text-[10px]">{b.bidId}</td>
                                <td className="px-2 py-1.5">{b.client}</td>
                                <td className="px-2 py-1.5 text-muted-foreground">{b.sector}</td>
                                <td className="px-2 py-1.5 text-muted-foreground">{b.budget}</td>
                                <td className={`px-2 py-1.5 font-bold ${scoreColor(b.score)}`}>{b.score}%</td>
                                <td className={`px-2 py-1.5 font-semibold ${outcomeColor(b.outcome)}`}>{b.outcome}</td>
                                <td className="px-2 py-1.5 text-muted-foreground">{b.compliancePct}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
