// Company Document Registry — maps document IDs to metadata and aliases.
// Used by bid readiness checks to identify which company documents are needed.

export type CompanyDocumentCategory =
  | "legal_registration"
  | "tax_compliance"
  | "financial"
  | "bid_specific"
  | "declarations"
  | "experience_credentials"
  | "technical_credentials"
  | "certifications"
  | "company_profile";

export type CompanyDocumentType = {
  id: string;
  name: string;
  category: CompanyDocumentCategory;
  description: string;
  aliases: string[]; // lowercase strings used for matching against requirement text
};

export const COMPANY_DOCUMENT_TYPES: CompanyDocumentType[] = [
  // ── Legal Registration ──────────────────────────────────────────────────────
  {
    id: "secp_certificate",
    name: "SECP Registration Certificate",
    category: "legal_registration",
    description: "Securities and Exchange Commission of Pakistan registration certificate.",
    aliases: ["secp", "incorporation certificate", "company registration", "registered company", "certificate of incorporation"],
  },
  {
    id: "moa_aoa",
    name: "Memorandum & Articles of Association",
    category: "legal_registration",
    description: "MOA/AOA documents from SECP filings.",
    aliases: ["memorandum of association", "articles of association", "moa", "aoa", "memorandum and articles"],
  },
  {
    id: "secp_form_a",
    name: "SECP Form A (Annual Return)",
    category: "legal_registration",
    description: "Annual return filing with SECP.",
    aliases: ["secp form a", "annual return", "form a", "secp annual"],
  },
  // ── Tax Compliance ──────────────────────────────────────────────────────────
  {
    id: "ntn_certificate",
    name: "NTN Certificate",
    category: "tax_compliance",
    description: "National Tax Number certificate from FBR.",
    aliases: ["ntn", "national tax number", "ntn certificate", "tax registration number"],
  },
  {
    id: "income_tax_atl",
    name: "Active Taxpayer List (ATL) Printout",
    category: "tax_compliance",
    description: "FBR active taxpayer status printout.",
    aliases: ["active taxpayer", "atl", "active taxpayer list", "fbr atl", "income tax atl", "taxpayer status"],
  },
  {
    id: "sales_tax_registration",
    name: "Sales Tax Registration Certificate",
    category: "tax_compliance",
    description: "FBR Sales Tax Registration certificate.",
    aliases: ["sales tax", "sales tax registration", "sales tax certificate", "strn certificate"],
  },
  {
    id: "strn_certificate",
    name: "STRN Certificate",
    category: "tax_compliance",
    description: "Sales Tax Registration Number certificate.",
    aliases: ["strn", "strn certificate", "sales tax reg number"],
  },
  // ── Financial ───────────────────────────────────────────────────────────────
  {
    id: "bank_statement_3m",
    name: "Bank Statement (Last 3 Months)",
    category: "financial",
    description: "Bank statements covering the last 3 months.",
    aliases: ["bank statement", "bank statements 3 months", "3 month bank statement", "bank statement 3"],
  },
  {
    id: "bank_statement_6m",
    name: "Bank Statement (Last 6 Months)",
    category: "financial",
    description: "Bank statements covering the last 6 months.",
    aliases: ["bank statement 6", "6 month bank statement", "bank statements 6 months", "financial standing bank"],
  },
  {
    id: "audited_financials",
    name: "Audited Financial Statements",
    category: "financial",
    description: "Last 2–3 years audited financial statements.",
    aliases: ["audited financials", "audited financial statements", "financial statements", "audited accounts", "annual accounts"],
  },
  // ── Bid Specific ────────────────────────────────────────────────────────────
  {
    id: "tender_fee_challan",
    name: "Tender Fee Payment Challan",
    category: "bid_specific",
    description: "Proof of tender fee payment.",
    aliases: ["tender fee", "tender fee challan", "bid fee", "bid fee challan", "payment challan"],
  },
  {
    id: "bid_security",
    name: "Bid Security / Earnest Money",
    category: "bid_specific",
    description: "Bank guarantee or pay order for bid security / earnest money.",
    aliases: ["bid security", "earnest money", "bank guarantee bid", "bid bond", "bid guarantee", "emd"],
  },
  {
    id: "performance_guarantee",
    name: "Performance Guarantee",
    category: "bid_specific",
    description: "Bank guarantee for performance security.",
    aliases: ["performance guarantee", "performance security", "performance bond", "contract guarantee"],
  },
  {
    id: "proposal_securing_declaration",
    name: "Proposal Securing Declaration",
    category: "bid_specific",
    description: "Standard PPRA proposal securing declaration form.",
    aliases: ["proposal securing declaration", "proposal securing", "ppra declaration", "securing declaration"],
  },
  // ── Declarations ────────────────────────────────────────────────────────────
  {
    id: "non_blacklisting_affidavit",
    name: "Non-Blacklisting Affidavit",
    category: "declarations",
    description: "Signed affidavit confirming the company is not blacklisted.",
    aliases: ["non blacklisting", "blacklisting affidavit", "not blacklisted", "blacklist certificate", "blacklist undertaking", "non-blacklisting"],
  },
  {
    id: "beneficial_ownership_form",
    name: "Beneficial Ownership Declaration",
    category: "declarations",
    description: "Declaration of beneficial ownership as required by PPRA.",
    aliases: ["beneficial ownership", "beneficial owner", "ownership declaration", "beneficial ownership form"],
  },
  {
    id: "integrity_pact",
    name: "Integrity Pact",
    category: "declarations",
    description: "Signed integrity pact as required by procuring agency.",
    aliases: ["integrity pact", "anti-corruption declaration", "anti corruption pact", "integrity agreement"],
  },
  {
    id: "conflict_of_interest_declaration",
    name: "Conflict of Interest Declaration",
    category: "declarations",
    description: "Declaration of no conflict of interest.",
    aliases: ["conflict of interest", "conflict of interest declaration", "no conflict of interest", "coi declaration"],
  },
  {
    id: "eligibility_declaration",
    name: "Eligibility Declaration",
    category: "declarations",
    description: "Declaration of eligibility and non-debarment.",
    aliases: ["eligibility declaration", "eligibility certificate", "declaration of eligibility", "not debarred", "debarment declaration"],
  },
  // ── Authority / Authorization ────────────────────────────────────────────────
  {
    id: "authority_letter",
    name: "Authority Letter",
    category: "declarations",
    description: "Authorization letter for the person signing the proposal.",
    aliases: ["authority letter", "authorization letter", "power of attorney", "signing authority", "authorisation letter"],
  },
  {
    id: "board_resolution",
    name: "Board Resolution",
    category: "declarations",
    description: "Board resolution authorizing participation in the tender.",
    aliases: ["board resolution", "resolution of board", "directors resolution", "board authorization"],
  },
  // ── Experience & Credentials ────────────────────────────────────────────────
  {
    id: "past_performance_certificates",
    name: "Past Performance Certificates",
    category: "experience_credentials",
    description: "Completion certificates from previous clients for similar scope.",
    aliases: ["past performance", "performance certificate", "completion certificate", "experience certificate", "project completion certificate", "client certificate", "reference letter"],
  },
  {
    id: "key_staff_cvs",
    name: "Key Staff CVs / Organogram",
    category: "experience_credentials",
    description: "CVs for all named key personnel and company organogram.",
    aliases: ["staff cv", "key staff", "cv", "organogram", "team cv", "personnel cv", "key personnel", "key experts cv", "organization chart"],
  },
  // ── Technical Credentials ───────────────────────────────────────────────────
  {
    id: "pec_registration",
    name: "PEC Registration Certificate",
    category: "technical_credentials",
    description: "Pakistan Engineering Council registration certificate.",
    aliases: ["pec", "pakistan engineering council", "pec registration", "pec certificate", "pec category"],
  },
  {
    id: "pseb_registration",
    name: "PSEB Registration",
    category: "technical_credentials",
    description: "Pakistan Software Export Board registration.",
    aliases: ["pseb", "pakistan software export board", "pseb registration", "software export board"],
  },
  {
    id: "pta_license",
    name: "PTA License",
    category: "technical_credentials",
    description: "Pakistan Telecommunication Authority license.",
    aliases: ["pta", "pta license", "pakistan telecommunication authority", "telecom license"],
  },
  {
    id: "drap_license",
    name: "DRAP License",
    category: "technical_credentials",
    description: "Drug Regulatory Authority of Pakistan license.",
    aliases: ["drap", "drap license", "drug regulatory authority", "pharmaceutical license"],
  },
  {
    id: "psqca_certification",
    name: "PSQCA Certification",
    category: "technical_credentials",
    description: "Pakistan Standards and Quality Control Authority certification.",
    aliases: ["psqca", "pakistan standards", "quality control authority", "psqca certification"],
  },
  // ── ISO / Management System Certifications ──────────────────────────────────
  {
    id: "iso_9001",
    name: "ISO 9001 Certificate",
    category: "certifications",
    description: "ISO 9001 Quality Management System certificate.",
    aliases: ["iso 9001", "iso9001", "quality management system", "qms certificate"],
  },
  {
    id: "iso_14001",
    name: "ISO 14001 Certificate",
    category: "certifications",
    description: "ISO 14001 Environmental Management System certificate.",
    aliases: ["iso 14001", "iso14001", "environmental management", "ems certificate"],
  },
  {
    id: "iso_45001",
    name: "ISO 45001 Certificate",
    category: "certifications",
    description: "ISO 45001 Occupational Health and Safety certificate.",
    aliases: ["iso 45001", "iso45001", "health and safety management", "ohs certificate", "ohsms"],
  },
  {
    id: "iso_27001",
    name: "ISO 27001 Certificate",
    category: "certifications",
    description: "ISO 27001 Information Security Management System certificate.",
    aliases: ["iso 27001", "iso27001", "information security", "isms certificate"],
  },
  {
    id: "iso_20000",
    name: "ISO 20000 Certificate",
    category: "certifications",
    description: "ISO 20000 IT Service Management certificate.",
    aliases: ["iso 20000", "iso20000", "it service management", "itsm certificate"],
  },
  {
    id: "soc2_report",
    name: "SOC 2 Report",
    category: "certifications",
    description: "SOC 2 Type II audit report for data security.",
    aliases: ["soc 2", "soc2", "soc type 2", "service organization control", "soc report"],
  },
  {
    id: "cmmi_certification",
    name: "CMMI Certification",
    category: "certifications",
    description: "Capability Maturity Model Integration certification.",
    aliases: ["cmmi", "cmmi certification", "capability maturity model", "cmmi level"],
  },
  // ── Company Profile Documents ────────────────────────────────────────────────
  {
    id: "letterhead",
    name: "Company Letterhead",
    category: "company_profile",
    description: "Official company letterhead for proposal submission.",
    aliases: ["letterhead", "company letterhead", "official letterhead"],
  },
  {
    id: "company_profile_pdf",
    name: "Company Profile (PDF)",
    category: "company_profile",
    description: "Company brochure or profile document.",
    aliases: ["company profile", "company brochure", "corporate profile", "firm profile", "company presentation"],
  },
  {
    id: "company_organogram",
    name: "Company Organogram",
    category: "company_profile",
    description: "Organizational chart of the company.",
    aliases: ["organogram", "organization chart", "org chart", "company structure", "organizational chart"],
  },
];

// ── Helper functions ────────────────────────────────────────────────────────────

/**
 * Maps requirement text to a matching CompanyDocumentType by checking aliases.
 * Returns the first match found, or null.
 */
export function mapRequirementToCompanyDocument(requirementText: string): CompanyDocumentType | null {
  const lower = requirementText.toLowerCase();
  for (const doc of COMPANY_DOCUMENT_TYPES) {
    for (const alias of doc.aliases) {
      if (lower.includes(alias)) return doc;
    }
  }
  return null;
}

/** Returns all documents in a given category. */
export function getDocumentsByCategory(category: CompanyDocumentCategory): CompanyDocumentType[] {
  return COMPANY_DOCUMENT_TYPES.filter((d) => d.category === category);
}

/** Returns a document by its id, or undefined if not found. */
export function getDocumentById(id: string): CompanyDocumentType | undefined {
  return COMPANY_DOCUMENT_TYPES.find((d) => d.id === id);
}
