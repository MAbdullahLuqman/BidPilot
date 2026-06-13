export type CompanyCategory = "construction" | "it" | "consulting" | "logistics" | "services";

export const proposalStyleProfiles: Record<
  CompanyCategory,
  {
    label: string;
    tone: string;
    requiredSections: string[];
    formattingRules: string[];
  }
> = {
  construction: {
    label: "Construction / Engineering Technical Proposal",
    tone:
      "Formal Pakistani engineering-consultancy tone with precise headings, project appreciation, standards, methodology, staffing, QA/HSE, and implementation sequencing.",
    requiredSections: [
      "Cover page with procuring agency, project title, proposal type, submission date, and submitted-by block",
      "Table of contents",
      "Project introduction and background",
      "Project location and objective",
      "Appreciation / understanding of the project",
      "Scope of work and deliverables",
      "Approach and methodology",
      "Design standards and design parameters",
      "Surveys, investigations, data collection, and coordination",
      "Preliminary design and engineering approach",
      "Procurement, construction, and implementation methodology",
      "Traffic management / site management where relevant",
      "Quality assurance, health, safety, and environmental management",
      "Project organization, key experts, and staffing plan",
      "Work plan, schedule, milestones, and reporting",
      "Compliance matrix and annexures checklist",
    ],
    formattingRules: [
      "Use numbered hierarchy such as 1, 1.1, 1.1.1.",
      "Use formal section titles, not marketing slogans.",
      "Write in proposal-ready paragraphs with evidence placeholders where data is missing.",
      "Never invent certifications, equipment, staff CVs, project values, or client approvals.",
      "Mark missing evidence as [Evidence required] instead of pretending it exists.",
    ],
  },
  it: {
    label: "IT / Software Technical Proposal",
    tone:
      "Enterprise SaaS and systems-integration tone with architecture, security, delivery methodology, support, and compliance traceability.",
    requiredSections: [
      "Cover letter",
      "Executive summary",
      "Understanding of requirements",
      "Solution architecture",
      "Technical approach and implementation methodology",
      "Security, privacy, and compliance",
      "Project plan and milestones",
      "Team structure",
      "Relevant experience",
      "Support and SLA",
      "Compliance matrix",
      "Risks and assumptions",
    ],
    formattingRules: [
      "Ground every technical claim in uploaded capability evidence.",
      "Use tables for compliance, milestones, and roles.",
      "Do not claim certifications unless uploaded or found in company evidence.",
    ],
  },
  consulting: {
    label: "Consulting Proposal",
    tone: "Senior advisory tone with diagnostic approach, workstreams, deliverables, and governance.",
    requiredSections: ["Executive summary", "Understanding", "Methodology", "Workstreams", "Team", "Deliverables", "Timeline", "Compliance"],
    formattingRules: ["Use clear workstream structure.", "Separate assumptions from evidence-backed claims."],
  },
  logistics: {
    label: "Logistics / Supply Chain Proposal",
    tone: "Operational, compliance-heavy logistics proposal tone with fleet/resources, routing, safety, and SLA focus.",
    requiredSections: ["Executive summary", "Operational plan", "Fleet/resources", "Safety", "SLA", "Compliance", "Risk management"],
    formattingRules: ["Keep operational claims tied to evidence.", "Flag missing licenses or fleet documents."],
  },
  services: {
    label: "General Services Proposal",
    tone: "Professional services tone with scope, delivery model, quality, staffing, and compliance.",
    requiredSections: ["Executive summary", "Scope response", "Methodology", "Team", "Quality plan", "Compliance", "Timeline"],
    formattingRules: ["Use concise proposal-ready sections.", "Flag missing mandatory evidence."],
  },
};

export function inferCompanyCategory(input: string): CompanyCategory {
  const text = input.toLowerCase();
  if (/(construction|highway|road|bridge|engineering|civil|motorway|dfbot|design build)/.test(text)) {
    return "construction";
  }
  if (/(software|it|technology|saas|cloud|erp|app|ai|cyber|data)/.test(text)) {
    return "it";
  }
  if (/(logistics|supply chain|transport|fleet|warehouse)/.test(text)) {
    return "logistics";
  }
  if (/(consulting|advisory|feasibility|study|capacity building)/.test(text)) {
    return "consulting";
  }
  return "services";
}
