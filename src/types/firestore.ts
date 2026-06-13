import type { Timestamp } from "firebase/firestore";

export type UserDoc = {
  name: string;
  email: string;
  companyId: string | null;
  role: "owner" | "member";
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type CompanyDoc = {
  ownerUserId: string;
  companyName: string;
  websiteUrl: string;
  sector: string;
  city: string;
  country: string;
  ntn: string | null;
  size: string | null;
  mainServices: string[];
  description: string;
  contactPerson: string;
  contactEmail: string;
  phone: string;
  onboardingComplete: boolean;
  websiteAnalysisStatus: "pending" | "running" | "complete" | "failed";
  websiteAnalysisAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type CapabilityType =
  | "past_project"
  | "certification"
  | "team_experience"
  | "technical_skill"
  | "industry_experience"
  | "client_proof"
  | "financial_strength"
  | "delivery_methodology"
  | "compliance_document";

export type CapabilityDoc = {
  title: string;
  type: CapabilityType;
  description: string;
  sector: string | null;
  source: "website" | "document" | "manual";
  sourceUrl: string | null;
  evidenceText: string;
  tags: string[];
  relatedServices: string[];
  confidenceScore: number;
  proposalReadyText: string;
  createdAt: Timestamp;
};

export type ProposalSampleDoc = {
  title: string;
  fileUrl: string | null;
  extractedText: string;
  structureJson: unknown;
  styleAnalysis: unknown;
  createdAt: Timestamp;
};

export type WorkspaceStatus =
  | "created"
  | "parsing"
  | "analyzing"
  | "analyzed"
  | "matching"
  | "matched"
  | "generating"
  | "ready"
  | "failed";

export type GoNoGoDecision =
  | "STRONG_GO"
  | "GO_WITH_CAUTION"
  | "NO_GO_UNLESS_FIXED"
  | "NO_GO";

export type WorkspaceDoc = {
  companyId: string;
  ownerUserId: string;
  title: string;
  rfpTitle: string | null;
  issuerName: string | null;
  sector: string | null;
  documentUrl: string;
  documentMimeType: string;
  extractedText: string;
  status: WorkspaceStatus;
  submissionDeadline: Timestamp | null;
  budget: string | null;
  complianceScore: number | null;
  winProbability: number | null;
  goNoGoDecision: GoNoGoDecision | null;
  analysisJson: unknown | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type RequirementCategory =
  | "mandatory"
  | "technical"
  | "financial"
  | "eligibility"
  | "compliance"
  | "experience"
  | "team"
  | "other";

export type RequirementDoc = {
  title: string;
  description: string;
  category: RequirementCategory;
  mandatory: boolean;
  sourceSection: string | null;
  sourcePage: number | null;
  evaluationWeight: number | null;
  rawText: string;
  createdAt: Timestamp;
};

export type ComplianceStatus = "PASS" | "PARTIAL" | "FAIL" | "UNKNOWN";

export type ComplianceDoc = {
  requirementId: string;
  requirementText: string;
  status: ComplianceStatus;
  matchedCapabilityIds: string[];
  evidenceSummary: string;
  gapReason: string | null;
  suggestedAction: string | null;
  suggestedProposalLanguage: string | null;
  confidenceScore: number;
};

export type ProposalSectionDoc = {
  title: string;
  order: number;
  content: string;
  status: "draft" | "edited" | "approved";
  relatedRequirementIds: string[];
  matchedCapabilityIds: string[];
  confidenceScore: number;
  userEdited: boolean;
  updatedAt: Timestamp;
};

export type WinScoreDoc = {
  complianceFit: number;
  capabilityFit: number;
  similarExperience: number;
  documentReadiness: number;
  timelineFit: number;
  budgetFit: number;
  riskPenalty: number;
  finalScore: number;
  decision: GoNoGoDecision;
  reasoning: string;
  strengths: string[];
  risks: string[];
  nextActions: string[];
  createdAt: Timestamp;
};
