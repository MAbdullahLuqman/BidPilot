"use client";

import { useSyncExternalStore } from "react";
import type { User } from "firebase/auth";

export type StoredPastProject = {
  title: string;
  clientName: string;
  clientType: string;
  sector: string;
  projectValue: string;
  yearCompleted: string;
  durationMonths: string;
  scopeSummary: string;
  evidenceUploaded: boolean;
  performanceCertAvailable: boolean;
};

export type StoredCompany = {
  // Step 1 — basic info
  companyName: string;
  tradingName: string;
  category: string;
  sector: string;
  city: string;
  country: string;
  websiteUrl: string;
  contactPerson: string;
  contactEmail: string;
  phone: string;
  // Step 2 — legal & tax
  ntn: string;
  strn: string;
  secp: string;
  activetaxpayer: string;
  pecCategory: string;
  otherLicenses: string;
  taxDocsUploaded: boolean;
  taxDocNames: string;
  regDocsUploaded: boolean;
  regDocNames: string;
  // Step 3 — services & sectors
  mainServices: string;
  secondaryServices: string;
  industriesServed: string;
  geographicCoverage: string;
  clientType: string; // government/private/both
  typicalProjectSize: string;
  yearsInBusiness: string;
  size: string;
  description: string;
  // Step 4 — past projects
  pastProjects: StoredPastProject[];
  // Step 5 — certifications
  isoCertifications: string;
  otherCertifications: string;
  customCertificates: string[];
  vendorRegistrations: string;
  financialDocsAvailable: boolean;
  financialDocNames: string;
  bankStatementsAvailable: boolean;
  bankDocNames: string;
  // Step 6 — team
  numEmployees: string;
  keyExperts: string;
  softwareTools: string;
  // Uploads
  logoUrl: string;
  coverPageUrl: string;
  letterheadUrl: string;
  taxFileUrls: string[];   // data URLs of uploaded tax documents
  regFileUrls: string[];   // data URLs of uploaded registration documents
  certFileUrls: string[];  // data URLs of uploaded certificates
  // Capabilities (generated)
  capabilities?: StoredCapability[];
  // Active training dataset for tender matching
  activeDatasetId?: string;
};

export type StoredCapability = {
  title: string;
  type: string;
  evidence: string;
  confidence: number;
  tags: string[];
};

export type StoredRequirement = {
  id: string;
  requirement: string;
  mandatory: boolean;
  status: "PASS" | "PARTIAL" | "FAIL" | "UNKNOWN";
  evidence: string;
  action: string;
  confidence: number;
};

export type StoredWorkspace = {
  id: string;
  title: string;
  issuer: string;
  sector: string;
  rfpText: string;
  requirements: StoredRequirement[];
  createdAt: string;
  deepAnalysis?: import("@/app/api/rfp/deep-analyze/route").DeepAnalysisResult;
  parsedPages?: import("@/app/api/rfp/parse/route").ParsedPage[];
};

export type HallucinationRisk = "LOW" | "MEDIUM" | "HIGH";

export type StoredProposalSection = {
  id: string;
  title: string;
  html: string;
  confidence: number;
  sources: string[];
  evidenceStatus: "READY" | "NEEDS_EVIDENCE" | "REVIEW";
  // evidence metadata (populated by AI section-by-section generation)
  requirementsCovered: string[];
  evidenceUsed: string[];
  missingEvidence: string[];
  hallucinationRisk: HallucinationRisk;
  improvementSuggestion: string;
  approved: boolean;
};

export type StoredProposalDraft = {
  workspaceId: string;
  title: string;
  updatedAt: string;
  sections: StoredProposalSection[];
};

const STORAGE_EVENT = "bidpilot-storage";
const EMPTY_WORKSPACES: StoredWorkspace[] = [];
const jsonCache = new Map<string, { raw: string; value: unknown }>();

function baseKey(user: User | null | undefined) {
  return `bidpilot:${user?.uid ?? "anonymous"}`;
}

function companyKey(user: User | null | undefined) {
  return `${baseKey(user)}:company`;
}

function workspacesKey(user: User | null | undefined) {
  return `${baseKey(user)}:workspaces`;
}

function proposalKey(user: User | null | undefined, workspaceId: string) {
  return `${baseKey(user)}:proposal:${workspaceId}`;
}

export function getStoredCompany(user: User | null | undefined): StoredCompany | null {
  return readJson<StoredCompany>(companyKey(user));
}

export function saveStoredCompany(user: User | null | undefined, company: StoredCompany) {
  window.localStorage.setItem(companyKey(user), JSON.stringify(company));
  notifyStorageSubscribers();
}

export function getStoredWorkspaces(user: User | null | undefined): StoredWorkspace[] {
  return readJson<StoredWorkspace[]>(workspacesKey(user)) ?? EMPTY_WORKSPACES;
}

export function saveStoredWorkspaces(user: User | null | undefined, workspaces: StoredWorkspace[]) {
  window.localStorage.setItem(workspacesKey(user), JSON.stringify(workspaces));
  notifyStorageSubscribers();
}

export function getStoredWorkspace(user: User | null | undefined, id: string) {
  return getStoredWorkspaces(user).find((workspace) => workspace.id === id) ?? null;
}

export function getStoredProposalDraft(user: User | null | undefined, workspaceId: string) {
  return readJson<StoredProposalDraft>(proposalKey(user, workspaceId));
}

export function saveStoredProposalDraft(user: User | null | undefined, draft: StoredProposalDraft) {
  window.localStorage.setItem(proposalKey(user, draft.workspaceId), JSON.stringify(draft));
  notifyStorageSubscribers();
}

export function clearStoredProposalDraft(user: User | null | undefined, workspaceId: string) {
  window.localStorage.removeItem(proposalKey(user, workspaceId));
  notifyStorageSubscribers();
}

export function useStoredCompany(user: User | null | undefined): StoredCompany | null {
  return useSyncExternalStore(
    subscribeToStorage,
    () => getStoredCompany(user),
    () => null,
  );
}

export function useStoredWorkspaces(user: User | null | undefined): StoredWorkspace[] {
  return useSyncExternalStore(
    subscribeToStorage,
    () => getStoredWorkspaces(user),
    () => EMPTY_WORKSPACES,
  );
}

export function useStoredWorkspace(user: User | null | undefined, id: string): StoredWorkspace | null {
  const workspaces = useStoredWorkspaces(user);
  return workspaces.find((workspace) => workspace.id === id) ?? null;
}

export function useStoredProposalDraft(user: User | null | undefined, workspaceId: string): StoredProposalDraft | null {
  return useSyncExternalStore(
    subscribeToStorage,
    () => getStoredProposalDraft(user, workspaceId),
    () => null,
  );
}

export function inferCapabilities(company: StoredCompany): StoredCapability[] {
  const text = `${company.companyName} ${company.category} ${company.sector} ${company.mainServices} ${company.description}`.toLowerCase();
  const capabilities: StoredCapability[] = [];

  if (/(construction|engineering|road|highway|bridge|civil|motorway)/.test(text)) {
    capabilities.push(
      {
        title: "Civil engineering and infrastructure delivery",
        type: "industry_experience",
        evidence: `${company.companyName} describes services around ${company.mainServices || "construction / engineering delivery"}.`,
        confidence: 0.76,
        tags: ["construction", "engineering", "infrastructure"],
      },
      {
        title: "Technical methodology and project coordination",
        type: "delivery_methodology",
        evidence: "Company profile indicates capability to prepare technical approach, coordination plan, and delivery methodology.",
        confidence: 0.7,
        tags: ["methodology", "coordination", "technical proposal"],
      },
    );
  } else if (/(software|it|ai|cloud|erp|web|app|data|technology)/.test(text)) {
    capabilities.push(
      {
        title: "Software platform delivery",
        type: "technical_skill",
        evidence: `${company.companyName} lists services around ${company.mainServices || "software / IT delivery"}.`,
        confidence: 0.78,
        tags: ["software", "platform", "delivery"],
      },
      {
        title: "Digital workflow automation",
        type: "technical_skill",
        evidence: "Company profile supports modern digital systems and workflow automation positioning.",
        confidence: 0.72,
        tags: ["automation", "AI", "systems"],
      },
    );
  }

  capabilities.push({
    title: "Company contact and bidder profile",
    type: "compliance_document",
    evidence: `Contact person: ${company.contactPerson || "not provided"}. Email: ${company.contactEmail || "not provided"}. NTN: ${company.ntn || "missing"}.`,
    confidence: company.ntn ? 0.82 : 0.52,
    tags: ["profile", "contact", company.ntn ? "registration" : "gap"],
  });

  return capabilities;
}

export function extractRequirements(rfpText: string, company: StoredCompany | null): StoredRequirement[] {
  const sentences = rfpText
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 20)
    .slice(0, 8);

  const source = sentences.length
    ? sentences
    : [
        "Bidder must submit a technical proposal with methodology, work plan, and relevant evidence.",
        "Bidder must provide company registration, tax information, and contact details.",
        "Bidder must demonstrate relevant experience for the required sector.",
      ];

  return source.map((requirement, index) => {
    const lower = requirement.toLowerCase();
    const hasEvidence =
      company &&
      (lower.includes(company.category.toLowerCase()) ||
        lower.includes(company.sector.toLowerCase().split(" ")[0] ?? "") ||
        company.mainServices.toLowerCase().split(/[,\s]+/).some((token) => token.length > 4 && lower.includes(token)));
    const registration = /ntn|registration|tax|certificate|certification|iso/.test(lower);
    const status = hasEvidence ? "PASS" : registration && !company?.ntn ? "UNKNOWN" : "PARTIAL";

    return {
      id: `REQ-${String(index + 1).padStart(3, "0")}`,
      requirement,
      mandatory: /must|required|shall|mandatory/.test(lower),
      status,
      evidence: hasEvidence
        ? `Matched against ${company?.companyName} profile/services.`
        : registration
          ? "Registration/certification evidence is missing or not uploaded."
          : "Partial profile match. Add more evidence to improve confidence.",
      action: hasEvidence
        ? "Use this evidence in the proposal response."
        : "Upload supporting documents or strengthen company capability evidence.",
      confidence: hasEvidence ? 0.82 : registration ? 0.38 : 0.62,
    };
  });
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(key);
    if (!value) {
      jsonCache.delete(key);
      return null;
    }
    const cached = jsonCache.get(key);
    if (cached?.raw === value) {
      return cached.value as T;
    }
    const parsed = JSON.parse(value) as T;
    jsonCache.set(key, { raw: value, value: parsed });
    return parsed;
  } catch {
    return null;
  }
}

function subscribeToStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(STORAGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(STORAGE_EVENT, onStoreChange);
  };
}

function notifyStorageSubscribers() {
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function deleteStoredWorkspace(user: Parameters<typeof baseKey>[0], id: string) {
  const workspaces = getStoredWorkspaces(user).filter((w) => w.id !== id);
  window.localStorage.setItem(workspacesKey(user), JSON.stringify(workspaces));
  window.localStorage.removeItem(proposalKey(user, id));
  notifyStorageSubscribers();
}

export function updateWorkspaceRequirementStatus(
  user: Parameters<typeof baseKey>[0],
  workspaceId: string,
  reqId: string,
  status: StoredRequirement["status"],
) {
  const workspaces = getStoredWorkspaces(user).map((w) => {
    if (w.id !== workspaceId) return w;
    return {
      ...w,
      requirements: w.requirements.map((r) =>
        r.id === reqId
          ? { ...r, status, evidence: status === "PASS" ? "Manually confirmed as met." : r.evidence, confidence: status === "PASS" ? 0.9 : status === "PARTIAL" ? 0.55 : 0.1 }
          : r,
      ),
    };
  });
  window.localStorage.setItem(workspacesKey(user), JSON.stringify(workspaces));
  notifyStorageSubscribers();
}
