import type {
  StoredCompany,
  StoredProposalDraft,
  StoredProposalSection,
  StoredRequirement,
  StoredWorkspace,
} from "@/lib/client-storage";

export type ExampleProposalTemplate = {
  id: "construction-dfbot" | "it-platform" | "consulting-services";
  title: string;
  sector: string;
  description: string;
  sections: { title: string; body: string[] }[];
};

export const exampleProposalTemplates: ExampleProposalTemplate[] = [
  {
    id: "construction-dfbot",
    title: "Motorway DFBOT Technical Proposal",
    sector: "Engineering & Construction",
    description: "Infrastructure proposal structure inspired by the D.I Khan Motorway sample: appreciation, design basis, methodology, BOQ, surveys, and staffing.",
    sections: [
      {
        title: "Approach Paper on Methodology for Assignment",
        body: [
          "The consultant will provide planning, preliminary design, engineering coordination, and technical proposal preparation services for a motorway delivered on a DFBOT basis.",
          "The response is organized around project appreciation, design standards, survey methodology, technical disciplines, implementation planning, and evidence-backed deliverables.",
        ],
      },
      {
        title: "Project Appreciation",
        body: [
          "The proposed road corridor is treated as a strategic mobility asset with direct economic, regional connectivity, logistics, safety, and public-service access impacts.",
          "The bidder should connect the project need with national transport priorities, corridor constraints, local geography, social impact, and operational sustainability.",
        ],
      },
      {
        title: "Approach and Methodology",
        body: [
          "The assignment will begin with a kick-off meeting, data request register, reconnaissance visit, stakeholder coordination plan, and confirmation of design parameters.",
          "Technical workstreams will cover topographic survey, traffic survey, hydrology and drainage, geotechnical investigations, pavement design, structural design, tunnel/bridge assessment, BOQ preparation, and risk review.",
        ],
      },
      {
        title: "Design Basis and Standards",
        body: [
          "Design criteria should reference AASHTO geometric standards, LRFD bridge design practice, pavement design guidance, drainage standards, safety manuals, local highway codes, and client-specific requirements.",
          "Any unavailable evidence, survey data, or authority approval should be marked as a clarification item rather than assumed.",
        ],
      },
      {
        title: "Staffing and Deliverables",
        body: [
          "The team should include highway, pavement, structural, hydrology, geotechnical, survey, quantity, environmental, and proposal coordination specialists.",
          "Deliverables include inception report, alignment study, survey outputs, preliminary design package, technical proposal, BOQ, engineer estimate, risk register, and annexure checklist.",
        ],
      },
    ],
  },
  {
    id: "it-platform",
    title: "AI Workflow Platform Technical Proposal",
    sector: "Software & IT Services",
    description: "A technical software bid with solution architecture, delivery methodology, security, integrations, implementation plan, and support model.",
    sections: [
      {
        title: "Executive Summary",
        body: [
          "The bidder proposes a secure AI-enabled workflow platform that digitizes intake, analysis, review, approval, reporting, and evidence management for the client organization.",
          "The proposal uses modular delivery, clear acceptance criteria, and traceable compliance mapping against each requirement.",
        ],
      },
      {
        title: "Solution Architecture",
        body: [
          "The platform will include role-based access, document upload, structured extraction, review workflows, dashboards, audit logs, notifications, and export services.",
          "Integration touchpoints, data residency, backup, authentication, monitoring, and API boundaries must be validated during discovery.",
        ],
      },
      {
        title: "Implementation Methodology",
        body: [
          "Delivery will proceed through discovery, UX validation, sprint-based build, system integration testing, user acceptance testing, training, pilot launch, and stabilization.",
          "Risks are managed through weekly demos, backlog governance, change control, test evidence, and deployment readiness gates.",
        ],
      },
      {
        title: "Security and Quality Assurance",
        body: [
          "Security controls include least-privilege roles, encryption in transit, secrets management, audit logging, dependency review, and environment separation.",
          "Quality assurance includes unit tests, integration tests, accessibility checks, performance checks, and defect triage before acceptance.",
        ],
      },
    ],
  },
  {
    id: "consulting-services",
    title: "Management Consulting Technical Proposal",
    sector: "Consulting",
    description: "A professional services proposal with understanding, work plan, stakeholder engagement, deliverables, governance, and quality controls.",
    sections: [
      {
        title: "Understanding of the Assignment",
        body: [
          "The assignment requires a structured advisory engagement that combines document review, stakeholder interviews, field validation, analysis, reporting, and implementation support.",
          "The bidder should show sector understanding, local context, decision risks, and measurable outcomes.",
        ],
      },
      {
        title: "Work Plan and Methodology",
        body: [
          "The work plan is divided into inception, diagnostic assessment, option design, validation, final reporting, and implementation roadmap phases.",
          "Each phase includes inputs, activities, outputs, review points, and acceptance criteria.",
        ],
      },
      {
        title: "Team and Governance",
        body: [
          "The delivery team includes a project director, engagement manager, subject specialists, analyst support, QA reviewer, and client coordination lead.",
          "Governance includes weekly progress meetings, issue logs, decision registers, document control, and steering committee reporting.",
        ],
      },
      {
        title: "Deliverables and Quality Control",
        body: [
          "Deliverables include inception report, diagnostic findings, options paper, stakeholder validation notes, final report, implementation roadmap, and executive presentation.",
          "Quality control is handled through peer review, source traceability, version control, and approval gates.",
        ],
      },
    ],
  },
];

export function buildProposalDraft(workspace: StoredWorkspace, company: StoredCompany | null): StoredProposalDraft {
  const requirements = workspace.requirements;
  const companyName = company?.companyName || "The bidder";
  const issuer = workspace.issuer || "the procuring agency";
  const mandatory = requirements.filter((item) => item.mandatory);
  const gaps = requirements.filter((item) => item.status !== "PASS");

  return {
    workspaceId: workspace.id,
    title: `${workspace.title} Technical Proposal`,
    updatedAt: new Date().toISOString(),
    sections: [
      section("cover", "Cover Page", 0.9, ["Company profile", "Workspace metadata"], "READY", [
        `<p class="proposal-kicker">TECHNICAL PROPOSAL</p>`,
        `<h1>${escapeHtml(workspace.title)}</h1>`,
        `<p>Submitted to <strong>${escapeHtml(issuer)}</strong></p>`,
        `<p>Submitted by <strong>${escapeHtml(companyName)}</strong></p>`,
        `<p>${escapeHtml(company?.city || "City")}, ${escapeHtml(company?.country || "Pakistan")}</p>`,
      ]),
      section("toc", "Table of Contents", 0.84, ["Generated proposal structure"], "REVIEW", [
        "<ol>",
        "<li>Executive Summary</li>",
        "<li>Appreciation of the Project</li>",
        "<li>Understanding of Scope and Requirements</li>",
        "<li>Approach and Methodology</li>",
        "<li>Technical Work Plan</li>",
        "<li>Compliance Matrix</li>",
        "<li>Risk and Evidence Register</li>",
        "<li>Team, Deliverables, and Annexures</li>",
        "</ol>",
      ]),
      section("executive-summary", "Executive Summary", 0.78, ["Company profile", "RFP workspace"], "REVIEW", [
        `<p>${escapeHtml(companyName)} submits this technical proposal in response to ${escapeHtml(workspace.title)}. The proposal is structured to show project understanding, methodology, compliance, evidence gaps, and an implementation-ready work plan.</p>`,
        `<p>The response uses the saved bidder profile and this workspace's extracted RFP requirements. Unsupported certifications, project values, client names, and compliance claims remain marked for evidence rather than invented.</p>`,
      ]),
      section("project-appreciation", "Appreciation of the Project", 0.72, ["RFP text", "Sample proposal pattern"], "REVIEW", [
        `<p>The assignment should be positioned as a strategic project for ${escapeHtml(issuer)}, with emphasis on the client's operational objectives, delivery constraints, stakeholder expectations, and measurable outcomes.</p>`,
        `<p>Use this section to explain why the project matters, where the main risks sit, and how the bidder's relevant capability applies to this exact tender.</p>`,
      ]),
      section("scope", "Understanding of Scope and Requirements", 0.8, ["Extracted requirements"], "REVIEW", [
        `<p>The extracted requirement set contains <strong>${requirements.length}</strong> items, including <strong>${mandatory.length}</strong> mandatory items. The response should address every mandatory requirement with traceable evidence.</p>`,
        requirementsList(requirements.slice(0, 8)),
      ]),
      section("methodology", "Approach and Methodology", 0.76, ["RFP text", "Company services"], "REVIEW", [
        `<p>The methodology is organized into mobilization, data collection, analysis/design, validation, documentation, quality review, and final submission stages.</p>`,
        `<ul><li>Kick-off meeting and data request register.</li><li>Review of available RFP documents and clarification items.</li><li>Technical workstream planning aligned with the tender scope.</li><li>Internal QA review before client submission.</li></ul>`,
      ]),
      section("work-plan", "Technical Work Plan", 0.74, ["Sample proposal pattern"], "REVIEW", [
        "<table><thead><tr><th>Stage</th><th>Activities</th><th>Output</th></tr></thead><tbody>",
        "<tr><td>1. Mobilization</td><td>Team assignment, data request, schedule confirmation</td><td>Inception note</td></tr>",
        "<tr><td>2. Analysis</td><td>Requirement review, evidence mapping, technical approach</td><td>Compliance register</td></tr>",
        "<tr><td>3. Proposal Development</td><td>Draft sections, review risks, finalize annexures</td><td>Technical proposal</td></tr>",
        "<tr><td>4. Final QA</td><td>Consistency, formatting, missing evidence check</td><td>Submission-ready package</td></tr>",
        "</tbody></table>",
      ]),
      section("compliance", "Compliance Matrix", 0.84, ["Extracted requirements", "Company evidence"], gaps.length ? "NEEDS_EVIDENCE" : "READY", [
        complianceTable(requirements),
      ]),
      section("risk-register", "Risk and Evidence Register", 0.82, ["Compliance analysis"], gaps.length ? "NEEDS_EVIDENCE" : "READY", [
        gaps.length ? riskTable(gaps) : "<p>No open evidence gaps were detected. Keep final supporting documents attached as annexures.</p>",
      ]),
      section("team-deliverables", "Team, Deliverables, and Annexures", 0.7, ["Company profile", "Sample proposal pattern"], "NEEDS_EVIDENCE", [
        "<p>Replace the placeholder team roles with named staff, CV references, licenses, and relevant project evidence before submission.</p>",
        "<table><thead><tr><th>Role</th><th>Named resource</th><th>Evidence required</th></tr></thead><tbody><tr><td>Project Director</td><td>[Name]</td><td>CV and authorization</td></tr><tr><td>Technical Lead</td><td>[Name]</td><td>Relevant project evidence</td></tr><tr><td>QA Reviewer</td><td>[Name]</td><td>Review checklist</td></tr></tbody></table>",
      ]),
    ],
  };
}

export function getExampleTemplate(id: string | null): ExampleProposalTemplate {
  return exampleProposalTemplates.find((template) => template.id === id) ?? exampleProposalTemplates[0];
}

function section(
  id: string,
  title: string,
  confidence: number,
  sources: string[],
  evidenceStatus: StoredProposalSection["evidenceStatus"],
  htmlParts: string[],
): StoredProposalSection {
  return {
    id,
    title,
    confidence,
    sources,
    evidenceStatus,
    html: htmlParts.join("\n"),
    requirementsCovered: [],
    evidenceUsed: sources,
    missingEvidence: evidenceStatus === "NEEDS_EVIDENCE" ? ["Upload supporting documents or add capability evidence"] : [],
    hallucinationRisk: confidence >= 0.8 ? "LOW" : confidence >= 0.65 ? "MEDIUM" : "HIGH",
    improvementSuggestion: evidenceStatus === "NEEDS_EVIDENCE" ? "Add company evidence to strengthen this section before submission." : "",
    approved: false,
  };
}

function requirementsList(requirements: StoredRequirement[]) {
  if (!requirements.length) {
    return "<p>No requirements were extracted yet. Paste a complete tender/RFP before finalizing this section.</p>";
  }
  return `<ol>${requirements.map((item) => `<li><strong>${escapeHtml(item.id)}</strong>: ${escapeHtml(item.requirement)}</li>`).join("")}</ol>`;
}

function complianceTable(requirements: StoredRequirement[]) {
  if (!requirements.length) {
    return "<p>No compliance rows are available yet.</p>";
  }
  return `<table><thead><tr><th>Requirement</th><th>Status</th><th>Evidence</th><th>Action</th></tr></thead><tbody>${requirements
    .map(
      (item) =>
        `<tr><td><strong>${escapeHtml(item.id)}</strong><br>${escapeHtml(item.requirement)}</td><td>${item.status}</td><td>${escapeHtml(item.evidence)}</td><td>${escapeHtml(item.action)}</td></tr>`,
    )
    .join("")}</tbody></table>`;
}

function riskTable(requirements: StoredRequirement[]) {
  return `<table><thead><tr><th>Gap</th><th>Why it matters</th><th>Next action</th></tr></thead><tbody>${requirements
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.id)} - ${item.status}</td><td>${escapeHtml(item.requirement)}</td><td>${escapeHtml(item.action)}</td></tr>`,
    )
    .join("")}</tbody></table>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
