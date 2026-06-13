import "server-only";

const LLAMA_API_BASE = "https://api.cloud.llamaindex.ai/api/v1/parsing";

export type LlamaParseStatus = "PENDING" | "SUCCESS" | "ERROR" | "PARTIAL_SUCCESS";

export type LlamaParseJobResult = {
  jobId: string;
  status: LlamaParseStatus;
  markdown: string;
  pageCount: number;
};

function apiKey(): string {
  const key = process.env.LLAMA_CLOUD_API_KEY;
  if (!key) throw new Error("LLAMA_CLOUD_API_KEY is not configured.");
  return key;
}

// Upload a file buffer to LlamaParse and return the job ID.
export async function uploadToLlamaParse(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string> {
  const form = new FormData();

  // LlamaParse expects the file as a Blob in the "file" field
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
  form.append("file", blob, fileName);

  // Parsing instructions that maximise structure fidelity for procurement docs
  form.append(
    "parsing_instruction",
    [
      "This is a procurement or Request for Proposal (RFP) document.",
      "Extract all text with perfect accuracy.",
      "Preserve all section headings, numbered lists, and bullet points.",
      "Reconstruct multi-page tables as complete Markdown tables — never truncate a table mid-page.",
      "Capture evaluation criteria weights, submission deadlines, eligibility clauses, and financial thresholds verbatim.",
      "Use [PAGE N] markers at the start of each page to indicate the source page number.",
      "Return structured Markdown only. Do not add commentary.",
    ].join(" "),
  );

  // Request Markdown output (LlamaParse also supports JSON and text)
  form.append("result_type", "markdown");
  form.append("language", "en");
  // Premium mode for better table reconstruction on complex government docs
  form.append("premium_mode", "true");

  const res = await fetch(`${LLAMA_API_BASE}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LlamaParse upload failed: ${res.status} — ${err.slice(0, 400)}`);
  }

  const data = (await res.json()) as { id?: string; job_id?: string };
  const jobId = data.id ?? data.job_id;
  if (!jobId) throw new Error("LlamaParse did not return a job ID.");
  return jobId;
}

// Poll LlamaParse until the job reaches a terminal state.
// Max wait: maxWaitMs (default 5 minutes). Polls every pollIntervalMs.
export async function waitForLlamaParseJob(
  jobId: string,
  opts: { maxWaitMs?: number; pollIntervalMs?: number } = {},
): Promise<LlamaParseStatus> {
  const maxWait = opts.maxWaitMs ?? 5 * 60 * 1000;
  const interval = opts.pollIntervalMs ?? 4000;
  const deadline = Date.now() + maxWait;

  while (Date.now() < deadline) {
    const res = await fetch(`${LLAMA_API_BASE}/job/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey()}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`LlamaParse status check failed: ${res.status} — ${err.slice(0, 300)}`);
    }

    const data = (await res.json()) as { status?: string };
    const status = (data.status ?? "PENDING").toUpperCase() as LlamaParseStatus;

    if (status === "SUCCESS" || status === "PARTIAL_SUCCESS" || status === "ERROR") {
      return status;
    }

    // Still processing — wait before next poll
    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error(`LlamaParse job ${jobId} did not complete within ${maxWait / 1000}s.`);
}

// Fetch the Markdown result for a completed job.
export async function fetchLlamaParseMarkdown(jobId: string): Promise<string> {
  const res = await fetch(`${LLAMA_API_BASE}/job/${jobId}/result/markdown`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LlamaParse result fetch failed: ${res.status} — ${err.slice(0, 300)}`);
  }

  // The response is a JSON object: { markdown: string, ... }
  const data = (await res.json()) as { markdown?: string; body?: string };
  return data.markdown ?? data.body ?? "";
}

// Convenience wrapper: upload → poll → fetch in one call.
// Use this from a long-running route (maxDuration ≥ 300s).
export async function parseDocumentToMarkdown(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<LlamaParseJobResult> {
  const jobId = await uploadToLlamaParse(buffer, fileName, mimeType);
  const status = await waitForLlamaParseJob(jobId);

  if (status === "ERROR") {
    throw new Error(`LlamaParse processing failed for job ${jobId}.`);
  }

  const markdown = await fetchLlamaParseMarkdown(jobId);

  // Count pages from [PAGE N] markers we injected via parsing_instruction
  const pageMarkers = markdown.match(/\[PAGE \d+\]/g);
  const pageCount = pageMarkers ? pageMarkers.length : 1;

  return { jobId, status, markdown, pageCount };
}
