import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export type AnthropicMessage = { role: "user" | "assistant"; content: string };

// Non-streaming call — returns full text. Use for short-to-medium outputs.
export async function callClaude(
  messages: AnthropicMessage[],
  options?: {
    system?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  },
): Promise<string> {
  const client = getClient();
  const response = await client.messages.create({
    model: options?.model ?? "claude-sonnet-4-6",
    max_tokens: options?.maxTokens ?? 8192,
    temperature: options?.temperature ?? 0.3,
    ...(options?.system ? { system: options.system } : {}),
    messages,
  });

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Claude returned a non-text block.");
  return block.text;
}

// Streaming call — returns a ReadableStream of Server-Sent Events (text deltas).
// The caller is responsible for returning this stream in a NextResponse.
export async function streamClaude(
  messages: AnthropicMessage[],
  options?: {
    system?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  },
): Promise<ReadableStream<Uint8Array>> {
  const client = getClient();

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const claudeStream = client.messages.stream({
          model: options?.model ?? "claude-sonnet-4-6",
          max_tokens: options?.maxTokens ?? 8192,
          temperature: options?.temperature ?? 0.3,
          ...(options?.system ? { system: options.system } : {}),
          messages,
        });

        for await (const event of claudeStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            // SSE format: "data: <json>\n\n"
            const payload = JSON.stringify({ delta: event.delta.text });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }

          if (event.type === "message_stop") {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Stream error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return stream;
}
