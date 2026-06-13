/**
 * Stage 1 — Document parsing via LlamaParse
 *
 * POST /api/parse
 *   Content-Type: multipart/form-data
 *   Body field "file": PDF, DOCX, or TXT
 *
 * Returns: ParseResponse JSON
 *
 * LlamaParse can take 30–120 s on large PDFs. maxDuration is set to 300 s
 * (5 minutes) which covers even a 300-page government tender.
 */

import { NextResponse } from "next/server";
import { parseDocumentToMarkdown } from "@/lib/ai/llamaparse";
import type { ParseResponse, ParseErrorResponse } from "@/types/proposal-pipeline";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes — required for large RFPs

const SUPPORTED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(req: Request): Promise<NextResponse> {
  // ── 1. API key guard ──────────────────────────────────────────────────────
  if (!process.env.LLAMA_CLOUD_API_KEY) {
    return NextResponse.json<ParseErrorResponse>(
      { error: "LLAMA_CLOUD_API_KEY is not configured on this server.", code: "no_api_key" },
      { status: 503 },
    );
  }

  // ── 2. Request validation ─────────────────────────────────────────────────
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json<ParseErrorResponse>(
      { error: "Send multipart/form-data with a 'file' field.", code: "invalid_request" },
      { status: 400 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json<ParseErrorResponse>(
      { error: "Could not parse multipart body.", code: "invalid_request" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json<ParseErrorResponse>(
      { error: "No file provided in 'file' field.", code: "invalid_request" },
      { status: 400 },
    );
  }

  const mimeType = file.type || "application/octet-stream";
  const fileName = file.name ?? "document.pdf";

  // Accept by MIME or by extension fallback for browsers that omit MIME
  const extMap: Record<string, string> = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
  };
  const ext = Object.keys(extMap).find((e) => fileName.toLowerCase().endsWith(e));
  const resolvedMime = SUPPORTED_TYPES.has(mimeType) ? mimeType : (ext ? extMap[ext] : mimeType);

  if (!SUPPORTED_TYPES.has(resolvedMime)) {
    return NextResponse.json<ParseErrorResponse>(
      { error: `Unsupported file type: ${resolvedMime}. Send PDF, DOCX, or TXT.`, code: "invalid_request" },
      { status: 415 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json<ParseErrorResponse>(
      { error: "File exceeds the 50 MB limit.", code: "invalid_request" },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(arrayBuffer);

  // ── 3. LlamaParse: upload → poll → fetch Markdown ─────────────────────────
  try {
    const result = await parseDocumentToMarkdown(buffer, fileName, resolvedMime);

    return NextResponse.json<ParseResponse>({
      jobId: result.jobId,
      status: result.status as "SUCCESS" | "PARTIAL_SUCCESS",
      markdown: result.markdown,
      pageCount: result.pageCount,
      charCount: result.markdown.length,
      extractionMethod: "llamaparse",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown parse error";

    // Distinguish timeout from generic failure for the frontend
    const isTimeout = message.toLowerCase().includes("did not complete within");
    return NextResponse.json<ParseErrorResponse>(
      {
        error: message,
        code: isTimeout ? "timeout" : "parse_failed",
      },
      { status: isTimeout ? 504 : 502 },
    );
  }
}
