export const demoCompany = {
  name: "Klarai Technologies",
  sector: "Software & IT Services",
  city: "Lahore",
  country: "Pakistan",
  website: "https://klarai.uk",
  contact: "Abdullah",
  email: "abdullah@klarai.uk",
  phone: "+92 300 0000000",
  description:
    "AI and software delivery studio focused on enterprise automation, web platforms, and data-driven operations.",
};

export const demoCapabilities = [
  {
    title: "AI workflow automation",
    type: "Technical skill",
    status: "PASS",
    confidence: 0.88,
    evidence:
      "Experience building AI-assisted business tools, document workflows, and structured proposal engines.",
    tags: ["AI", "automation", "document processing"],
  },
  {
    title: "Enterprise web application delivery",
    type: "Past project",
    status: "PASS",
    confidence: 0.84,
    evidence:
      "Modern full-stack delivery using Next.js, Firebase, authenticated dashboards, and controlled user workflows.",
    tags: ["Next.js", "Firebase", "SaaS"],
  },
  {
    title: "ISO 27001 certificate",
    type: "Certification",
    status: "UNKNOWN",
    confidence: 0.2,
    evidence: "No certificate has been uploaded yet. Marked as a mandatory evidence gap until provided.",
    tags: ["security", "certification", "gap"],
  },
];

export const demoRequirements = [
  {
    id: "REQ-001",
    requirement: "Bidder must show experience delivering enterprise software platforms.",
    mandatory: true,
    status: "PASS",
    evidence: "Matched enterprise web application delivery and AI workflow automation capabilities.",
    action: "Use matched project evidence in the technical approach and company profile.",
    confidence: 0.91,
  },
  {
    id: "REQ-002",
    requirement: "Bidder should provide a detailed implementation methodology and timeline.",
    mandatory: true,
    status: "PARTIAL",
    evidence: "Delivery methodology can be drafted, but no signed methodology document is uploaded.",
    action: "Generate methodology section and attach an implementation plan annexure.",
    confidence: 0.74,
  },
  {
    id: "REQ-003",
    requirement: "Bidder must provide ISO 27001 certification or equivalent controls.",
    mandatory: true,
    status: "UNKNOWN",
    evidence: "No ISO 27001 certificate found in profile, website, or uploaded documents.",
    action: "Upload certificate or flag as compliance risk before final submission.",
    confidence: 0.35,
  },
  {
    id: "REQ-004",
    requirement: "Proposal must include company registration, tax details, and contact information.",
    mandatory: true,
    status: "PARTIAL",
    evidence: "Contact data exists. NTN/registration evidence is not uploaded yet.",
    action: "Complete onboarding registration fields and upload supporting documents.",
    confidence: 0.68,
  },
] as const;

export const demoProposalSections = [
  {
    title: "Executive Summary",
    confidence: 0.86,
    content:
      "Klarai Technologies proposes a structured, evidence-backed delivery approach for the requested platform. Our team will combine modern web engineering, AI-assisted workflow design, and disciplined project governance to deliver a compliant, maintainable solution aligned with the issuer's requirements.",
  },
  {
    title: "Understanding of Requirements",
    confidence: 0.81,
    content:
      "The tender requires a vendor capable of analyzing operational needs, implementing a secure enterprise platform, documenting compliance, and supporting rollout. The proposal responds section-by-section to mandatory requirements and highlights evidence where available.",
  },
  {
    title: "Compliance Matrix",
    confidence: 0.78,
    content:
      "A requirement-level compliance matrix is included to identify PASS, PARTIAL, and UNKNOWN items. Items without uploaded evidence are explicitly marked as gaps so the bidder can fix them before submission.",
  },
];
