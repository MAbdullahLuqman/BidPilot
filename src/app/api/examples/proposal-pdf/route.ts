import { NextResponse } from "next/server";

import { getExampleTemplate } from "@/lib/proposal-draft";
import { createSimplePdf } from "@/lib/simple-pdf";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const template = getExampleTemplate(url.searchParams.get("template"));
  const lines = [
    `Sector: ${template.sector}`,
    "",
    template.description,
    "",
    "Table of Contents",
    ...template.sections.map((section, index) => `${index + 1}. ${section.title}`),
    "",
    ...template.sections.flatMap((section, index) => [
      `${index + 1}. ${section.title}`,
      ...section.body,
      "",
    ]),
    "Compliance principle: do not fabricate certifications, client names, project values, or evidence. Mark unavailable evidence as a gap.",
  ];
  const pdf = createSimplePdf(template.title, lines);

  return new NextResponse(pdf, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${template.id}.pdf"`,
    },
  });
}
