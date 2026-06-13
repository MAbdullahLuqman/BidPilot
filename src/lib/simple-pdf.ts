export function createSimplePdf(title: string, lines: string[]) {
  const pages = chunkLines(lines.map(normalizePdfText), 42);
  const objects: string[] = [];
  const pageRefs: number[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("PAGES");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  for (const pageLines of pages) {
    const contentId = objects.length + 2;
    const pageId = objects.length + 1;
    pageRefs.push(pageId);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.push(`<< /Length ${renderPage(title, pageLines).length} >>\nstream\n${renderPage(title, pageLines)}\nendstream`);
  }

  objects[1] = `<< /Type /Pages /Kids [${pageRefs.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`;

  const offsets: number[] = [];
  let pdf = "%PDF-1.4\n";
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

function renderPage(title: string, lines: string[]) {
  const commands = [
    "BT",
    "/F2 17 Tf",
    "52 790 Td",
    `(${escapePdf(normalizePdfText(title))}) Tj`,
    "/F1 10 Tf",
    "0 -24 Td",
  ];
  for (const line of lines) {
    commands.push(`(${escapePdf(line)}) Tj`);
    commands.push("0 -16 Td");
  }
  commands.push("ET");
  return commands.join("\n");
}

function chunkLines(lines: string[], size: number) {
  const chunks: string[][] = [];
  for (let index = 0; index < lines.length; index += size) {
    chunks.push(lines.slice(index, index + size));
  }
  return chunks.length ? chunks : [["No content available."]];
}

function normalizePdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 96);
}

function escapePdf(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
