import "server-only";
import OpenAI from "openai";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) throw new Error("XAI_API_KEY is not configured.");
    _client = new OpenAI({
      apiKey,
      baseURL: "https://api.x.ai/v1",
    });
  }
  return _client;
}

export type GrokMessage = { role: "system" | "user" | "assistant"; content: string };

export async function callGrok(
  messages: GrokMessage[],
  options?: { temperature?: number; maxTokens?: number; model?: string },
): Promise<string> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: options?.model ?? "grok-3-mini",
    messages,
    temperature: options?.temperature ?? 0.15,
    max_tokens: options?.maxTokens ?? 4096,
  });
  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("Grok returned an empty response.");
  return text;
}
