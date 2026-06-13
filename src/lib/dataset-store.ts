"use client";

import { useState, useEffect } from "react";
import type { User } from "firebase/auth";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BidRecord = {
  bidId: string;
  client: string;
  sector: string;
  budget: string;
  score: number;
  outcome: "Win" | "Loss";
  responseTimeHrs: number;
  compliancePct: number;
  docPages: number;
  gapsFound: number;
  bidManager: string;
  submissionDate: string;
};

export type CapabilityRecord = {
  capId: string;
  domain: string;
  projectSummary: string;
  certification: string;
  yearCompleted: number;
  contractValue: string;
  durationMonths: number;
  clientType: string;
};

export type TrainingDataset = {
  id: string;
  fileName: string;
  importedAt: string;
  bidHistory: BidRecord[];
  capabilities: CapabilityRecord[];
  // Groq-indexed summary for fast matching
  indexedAt?: string;
  domainIndex?: string[];   // unique domains present
  sectorIndex?: string[];   // unique sectors present
  winRate?: number;         // overall win rate %
};

export type MatchResult = {
  datasetId: string;
  datasetFileName: string;
  rfpSector: string;
  rfpDomain: string;
  matchedCapabilities: Array<CapabilityRecord & { matchScore: number; matchReason: string }>;
  similarBids: Array<BidRecord & { similarity: string }>;
  predictedOutcome: "Win" | "Loss" | "Uncertain";
  predictedScore: number;
  winProbability: number;
  complianceEstimate: number;
  gaps: string[];
  strengths: string[];
  recommendations: string[];
  groqAnalysis: string;
  generatedAt: string;
};

// ── Storage keys ──────────────────────────────────────────────────────────────

const STORAGE_EVENT = "bidpilot-datasets";

function datasetsKey(user: User | null | undefined) {
  return `bidpilot:${user?.uid ?? "anonymous"}:datasets`;
}

function matchKey(user: User | null | undefined, workspaceId: string) {
  return `bidpilot:${user?.uid ?? "anonymous"}:match:${workspaceId}`;
}

// ── Read / write helpers ──────────────────────────────────────────────────────

// Cache parsed values by key so getSnapshot returns the same reference when
// the underlying localStorage string hasn't changed — required by useSyncExternalStore.
const jsonCache = new Map<string, { raw: string; value: unknown }>();

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      jsonCache.delete(key);
      return null;
    }
    const cached = jsonCache.get(key);
    if (cached?.raw === raw) return cached.value as T;
    const parsed = JSON.parse(raw) as T;
    jsonCache.set(key, { raw, value: parsed });
    return parsed;
  } catch {
    return null;
  }
}

function notify() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }
}

// ── Dataset CRUD ──────────────────────────────────────────────────────────────

export function getStoredDatasets(user: User | null | undefined): TrainingDataset[] {
  return readJson<TrainingDataset[]>(datasetsKey(user)) ?? [];
}

export function saveDataset(user: User | null | undefined, dataset: TrainingDataset) {
  const existing = getStoredDatasets(user).filter((d) => d.id !== dataset.id);
  window.localStorage.setItem(datasetsKey(user), JSON.stringify([dataset, ...existing]));
  notify();
}

export function deleteDataset(user: User | null | undefined, id: string) {
  const remaining = getStoredDatasets(user).filter((d) => d.id !== id);
  window.localStorage.setItem(datasetsKey(user), JSON.stringify(remaining));
  notify();
}

export function updateDatasetIndex(
  user: User | null | undefined,
  id: string,
  patch: Partial<Pick<TrainingDataset, "indexedAt" | "domainIndex" | "sectorIndex" | "winRate">>,
) {
  const datasets = getStoredDatasets(user).map((d) =>
    d.id === id ? { ...d, ...patch } : d,
  );
  window.localStorage.setItem(datasetsKey(user), JSON.stringify(datasets));
  notify();
}

// ── Match result CRUD ─────────────────────────────────────────────────────────

export function getStoredMatchResult(user: User | null | undefined, workspaceId: string): MatchResult | null {
  return readJson<MatchResult>(matchKey(user, workspaceId));
}

export function saveMatchResult(user: User | null | undefined, result: MatchResult) {
  window.localStorage.setItem(matchKey(user, result.datasetId + "_" + result.generatedAt), JSON.stringify(result));
  // Also save under workspaceId for easy lookup — caller passes workspaceId as datasetId for this purpose
  notify();
}

export function saveWorkspaceMatchResult(user: User | null | undefined, workspaceId: string, result: MatchResult) {
  window.localStorage.setItem(matchKey(user, workspaceId), JSON.stringify(result));
  notify();
}

// ── React hooks ───────────────────────────────────────────────────────────────

export function useStoredDatasets(user: User | null | undefined): TrainingDataset[] {
  const uid = user?.uid ?? null;
  const [datasets, setDatasets] = useState<TrainingDataset[]>(() =>
    typeof window === "undefined" ? [] : getStoredDatasets(user),
  );

  useEffect(() => {
    const update = () => setDatasets(getStoredDatasets(user));
    update();
    window.addEventListener(STORAGE_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(STORAGE_EVENT, update);
      window.removeEventListener("storage", update);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  return datasets;
}

export function useStoredMatchResult(user: User | null | undefined, workspaceId: string): MatchResult | null {
  const uid = user?.uid ?? null;
  const [result, setResult] = useState<MatchResult | null>(() =>
    typeof window === "undefined" ? null : getStoredMatchResult(user, workspaceId),
  );

  useEffect(() => {
    const update = () => setResult(getStoredMatchResult(user, workspaceId));
    update();
    window.addEventListener(STORAGE_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(STORAGE_EVENT, update);
      window.removeEventListener("storage", update);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, workspaceId]);

  return result;
}
