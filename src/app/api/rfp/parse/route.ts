import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export type ParsedPage = {
  pageNumber: number;
  text: string;
  tables: string[];
  headings: string[];
  charCount: number;
};

export type ParsedDocument = {
  fullText: string;
  pages: ParsedPage[];
  markdown: string;
  metadata: {
    fileName: string;
    fileType: string;
    totalPages: number;
    charCount: number;
    estimatedReadingMinutes: number;
    extractionMethod: "pdf-page-level" | "docx" | "text" | "chunked";
  };
};

function extractHeadings(text: string): string[] {
  return text
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      return (
        t.length > 3 &&
        t.length < 120 &&
        (t === t.toUpperCase() || /^#{1,4}\s/.test(t) || /:\s*$/.test(t))
      );
    })
    .map((l) => l.trim())
    .slice(0, 20);
}

function extractTables(text: string): string[] {
  const lines = text.split("\n");
  const tables: string[] = [];
  let buf: string[] = [];
  for (const line of lines) {
    if (line.includes("|") || line.includes("\t")) {
      buf.push(line);
    } else {
      if (buf.length >= 2) tables.push(buf.join("\n"));
      buf = [];
    }
  }
  if (buf.length >= 2) tables.push(buf.join("\n"));
  return tables.slice(0, 10);
}

// Fallback: split one big string into ~3000-char chunks when we have no real pages
function chunkIntoPages(text: string, approxCharsPerPage = 3000): ParsedPage[] {
  if (!text.trim()) return [{ pageNumber: 1, text: "", headings: [], tables: [], charCount: 0 }];
  const chunks: ParsedPage[] = [];
  let offset = 0;
  let pageNum = 1;
  while (offset < text.length) {
    const slice = text.slice(offset, offset + approxCharsPerPage).trimEnd();
    chunks.push({ pageNumber: pageNum, text: slice, headings: extractHeadings(slice), tables: extractTables(slice), charCount: slice.length });
    offset += approxCharsPerPage;
    pageNum++;
  }
  return chunks;
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";

    // ── Plain text body ────────────────────────────────────────────────
    if (contentType.includes("text/plain")) {
      const text = await req.text();
      const pages = chunkIntoPages(text.trim());
      return NextResponse.json({
        fullText: text.trim(),
        pages,
        markdown: text.trim(),
        metadata: {
          fileName: "manual-paste.txt",
          fileType: "text/plain",
          totalPages: pages.length,
          charCount: text.length,
          estimatedReadingMinutes: Math.ceil(text.length / 1500),
          extractionMethod: "text",
        },
      } satisfies ParsedDocument);
    }

    // ── Multipart file upload ──────────────────────────────────────────
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Send multipart/form-data with a 'file' field, or text/plain body." }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided in 'file' field." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name ?? "document";
    const fileType = file.type ?? "";

    // ── PDF: page-by-page extraction ──────────────────────────────────
    if (fileType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = await import("pdf-parse/lib/pdf-parse.js" as any);
      const pdfParse: (buf: Buffer, opts?: Record<string, unknown>) => Promise<{ text: string; numpages: number }> =
        (mod as any).default ?? mod;

      // Collect per-page text by overriding the pagerender callback
      const pageTexts: string[] = [];
      let currentPageNum = 0;

      const customPageRender = (pageData: { getTextContent: (opts: Record<string, boolean>) => Promise<{ items: Array<{ str: string; transform: number[] }> }> }) => {
        currentPageNum++;
        const capturedPage = currentPageNum;
        return pageData
          .getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false })
          .then((content: { items: Array<{ str: string; transform: number[] }> }) => {
            let lastY: number | undefined;
            let text = "";
            for (const item of content.items) {
              if (lastY === item.transform[5] || lastY === undefined) {
                text += item.str;
              } else {
                text += "\n" + item.str;
              }
              lastY = item.transform[5];
            }
            pageTexts[capturedPage - 1] = text;
            return text;
          });
      };

      const result = await pdfParse(buffer, { pagerender: customPageRender });

      // Build proper per-page array (with real page numbers from PDF)
      const pages: ParsedPage[] = (pageTexts.length > 0 ? pageTexts : [result.text]).map((pageText, i) => {
        const cleaned = (pageText ?? "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
        return {
          pageNumber: i + 1,
          text: cleaned,
          headings: extractHeadings(cleaned),
          tables: extractTables(cleaned),
          charCount: cleaned.length,
        };
      });

      // Build fullText with page markers so the AI knows which page each content is on
      const fullTextWithPageMarkers = pages
        .map((p) => `[PAGE ${p.pageNumber}]\n${p.text}`)
        .join("\n\n");

      const cleaned = fullTextWithPageMarkers.replace(/\r\n/g, "\n").replace(/\n{4,}/g, "\n\n").trim();

      return NextResponse.json({
        fullText: cleaned,
        pages,
        markdown: cleaned,
        metadata: {
          fileName,
          fileType,
          totalPages: pages.length,
          charCount: cleaned.length,
          estimatedReadingMinutes: Math.ceil(cleaned.length / 1500),
          extractionMethod: "pdf-page-level",
        },
      } satisfies ParsedDocument);
    }

    // ── DOCX ──────────────────────────────────────────────────────────
    if (
      fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.toLowerCase().endsWith(".docx")
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      const cleaned = result.value.replace(/\r\n/g, "\n").replace(/\n{4,}/g, "\n\n").trim();
      const pages = chunkIntoPages(cleaned);
      return NextResponse.json({
        fullText: cleaned,
        pages,
        markdown: cleaned,
        metadata: {
          fileName,
          fileType,
          totalPages: pages.length,
          charCount: cleaned.length,
          estimatedReadingMinutes: Math.ceil(cleaned.length / 1500),
          extractionMethod: "docx",
        },
      } satisfies ParsedDocument);
    }

    // ── TXT ───────────────────────────────────────────────────────────
    if (fileType.startsWith("text/") || fileName.toLowerCase().endsWith(".txt")) {
      const text = buffer.toString("utf-8");
      const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{4,}/g, "\n\n").trim();
      const pages = chunkIntoPages(cleaned);
      return NextResponse.json({
        fullText: cleaned,
        pages,
        markdown: cleaned,
        metadata: {
          fileName,
          fileType,
          totalPages: pages.length,
          charCount: cleaned.length,
          estimatedReadingMinutes: Math.ceil(cleaned.length / 1500),
          extractionMethod: "text",
        },
      } satisfies ParsedDocument);
    }

    return NextResponse.json(
      { error: `Unsupported file type: ${fileType}. Send PDF, DOCX, or TXT.` },
      { status: 415 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Parse failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
