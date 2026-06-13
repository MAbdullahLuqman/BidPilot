import "server-only";

export type GeminiMessage = {
  role: "user" | "model";
  parts: Array<{ text: string }>;
};

export async function callGemini(
  prompt: string,
  options?: {
    temperature?: number;
    model?: string;
    systemInstruction?: string;
  },
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const model = options?.model ?? "gemini-2.5-flash-preview-05-20";

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options?.temperature ?? 0.1,
      maxOutputTokens: 8192,
    },
  };

  if (options?.systemInstruction) {
    body.systemInstruction = { parts: [{ text: options.systemInstruction }] };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini request failed: ${res.status} ${err.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message: string };
  };

  if (data.error) throw new Error(`Gemini error: ${data.error.message}`);

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

// Upload a PDF/image to Gemini File API and return the file URI
// This allows Gemini to read the original PDF directly (not just extracted text)
export async function uploadFileToGemini(
  buffer: Buffer,
  mimeType: string,
  displayName: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  // Step 1: initiate resumable upload
  const initRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(buffer.length),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "content-type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: displayName } }),
    },
  );

  if (!initRes.ok) throw new Error(`Gemini file upload init failed: ${initRes.status}`);

  const uploadUrl = initRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("Gemini did not return an upload URL.");

  // Step 2: upload file bytes
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Command": "upload, finalize",
      "X-Goog-Upload-Offset": "0",
      "content-type": mimeType,
    },
    body: buffer as unknown as BodyInit,
  });

  if (!uploadRes.ok) throw new Error(`Gemini file upload failed: ${uploadRes.status}`);

  const fileData = (await uploadRes.json()) as { file?: { uri?: string } };
  const uri = fileData.file?.uri;
  if (!uri) throw new Error("Gemini file upload did not return a URI.");
  return uri;
}

// Analyze a PDF file directly using Gemini's native file understanding
export async function analyzeFileWithGemini(
  fileUri: string,
  mimeType: string,
  prompt: string,
  options?: { temperature?: number; systemInstruction?: string },
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const body: Record<string, unknown> = {
    contents: [
      {
        role: "user",
        parts: [
          { fileData: { mimeType, fileUri } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: options?.temperature ?? 0.05,
      maxOutputTokens: 8192,
    },
  };

  if (options?.systemInstruction) {
    body.systemInstruction = { parts: [{ text: options.systemInstruction }] };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini file analysis failed: ${res.status} ${err.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message: string };
  };

  if (data.error) throw new Error(`Gemini error: ${data.error.message}`);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}
