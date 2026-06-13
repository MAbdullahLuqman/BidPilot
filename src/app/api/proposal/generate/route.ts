import { NextResponse } from "next/server";
import { z } from "zod";

import { callGroq } from "@/lib/ai/groq";
import { inferCompanyCategory, proposalStyleProfiles } from "@/lib/proposal-style";

export const runtime = "nodejs";

const requestSchema = z.object({
  companyName: z.string().default("Bidder"),
  companyCategory: z.string().optional(),
  rfpText: z.string().min(20),
  companyEvidence: z.string().default(""),
});

export async function POST(req: Request) {
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 });
  }

  const category = inferCompanyCategory(`${parsed.data.companyCategory ?? ""} ${parsed.data.rfpText}`);
  const style = proposalStyleProfiles[category];

  const text = await callGroq(
    [
      {
        role: "system",
        content:
          "You are BidPilot Pakistan, a senior proposal manager. Generate grounded, professional tender proposal text. Never fabricate certifications, client names, staff CVs, project values, approvals, or compliance evidence. If evidence is missing, write [Evidence required]. Do not copy any sample proposal verbatim.",
      },
      {
        role: "user",
        content: `Company: ${parsed.data.companyName}
Proposal category: ${style.label}
Tone: ${style.tone}
Required sections:
${style.requiredSections.map((section, index) => `${index + 1}. ${section}`).join("\n")}
Formatting rules:
${style.formattingRules.map((rule) => `- ${rule}`).join("\n")}

RFP / tender text:
${parsed.data.rfpText.slice(0, 12000)}

Company evidence:
${parsed.data.companyEvidence.slice(0, 6000)}

Return a polished technical proposal draft in Markdown with numbered headings, a compliance matrix, risks, assumptions, and annexure checklist.`,
      },
    ],
    { temperature: 0.25 },
  );

  return NextResponse.json({ category, style: style.label, proposal: text });
}
