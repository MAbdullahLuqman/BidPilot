// ─── Stage 1: Parse ────────────────────────────────────────────────────────

export type ParseResponse = {
  jobId: string;
  status: "SUCCESS" | "PARTIAL_SUCCESS";
  markdown: string;
  pageCount: number;
  charCount: number;
  extractionMethod: "llamaparse" | "pdf-fallback";
};

export type ParseErrorResponse = {
  error: string;
  code: "invalid_request" | "parse_failed" | "timeout" | "no_api_key";
};

// ─── Stage 2: Generate Proposal ────────────────────────────────────────────

export type CompanyData = {
  companyName: string;
  tradingName?: string;
  sector?: string;
  city?: string;
  country?: string;
  websiteUrl?: string;
  contactPerson?: string;
  contactEmail?: string;
  phone?: string;

  // Legal & compliance
  ntn?: string;
  strn?: string;
  secp?: string;
  pecCategory?: string;
  isoCertifications?: string;
  otherCertifications?: string;
  customCertificates?: string[];
  vendorRegistrations?: string;

  // Capabilities
  mainServices?: string;
  secondaryServices?: string;
  industriesServed?: string;
  geographicCoverage?: string;
  yearsInBusiness?: string;
  numEmployees?: string;
  keyExperts?: string;
  description?: string;

  // Financial proof
  financialDocsAvailable?: boolean;
  bankStatementsAvailable?: boolean;

  // Past projects
  pastProjects?: Array<{
    title: string;
    clientName: string;
    sector: string;
    projectValue?: string;
    yearCompleted?: string;
    scopeSummary?: string;
  }>;
};

export type GenerateProposalRequest = {
  rfpMarkdown: string;          // Output from Stage 1
  companyData: CompanyData;     // Your company's profile
  stream?: boolean;             // Whether to stream the response (default: true)
  sector?: string;              // Optional hint for sector-aware generation
};

// ─── Streamed output chunks ─────────────────────────────────────────────────

// Each SSE "data:" line is one of these, JSON-stringified
export type StreamChunk =
  | { delta: string }     // partial proposal text
  | { done: true; totalTokens?: number }
  | { error: string };
