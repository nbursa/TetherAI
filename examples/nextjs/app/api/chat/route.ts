import { NextRequest } from "next/server";
import {
  openAI,
  withRetry,
  type ChatRequest,
  type ChatStreamChunk,
  type Provider,
} from "@tetherai/openai";

export const runtime = "edge";

/** Type guards */
type Role = "user" | "assistant" | "system" | "tool";

function isRole(x: unknown): x is Role {
  return (
    typeof x === "string" &&
    (x === "user" || x === "assistant" || x === "system" || x === "tool")
  );
}

function isChatMessage(x: unknown): x is { role: Role; content: string } {
  return (
    typeof x === "object" &&
    x !== null &&
    "role" in x &&
    "content" in x &&
    isRole((x as { role: unknown }).role) &&
    typeof (x as { content: unknown }).content === "string"
  );
}

function isChatRequest(x: unknown): x is ChatRequest {
  if (
    typeof x !== "object" ||
    x === null ||
    !("model" in x) ||
    !("messages" in x)
  ) {
    return false;
  }

  const model = (x as { model: unknown }).model;
  const messages = (x as { messages: unknown }).messages;

  return (
    typeof model === "string" &&
    Array.isArray(messages) &&
    messages.every(isChatMessage)
  );
}

/** SSE helper (typed) */
function toSSEStream(iterable: AsyncIterable<ChatStreamChunk>) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of iterable) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
          );
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "error";
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message: msg })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });
}

/** Provider with retry */
if (
  typeof openAI !== "function" ||
  typeof withRetry !== "function" ||
  typeof process.env.OPENAI_API_KEY !== "string"
) {
  throw new Error("Required OpenAI API key or functions are not available.");
}

const provider: Provider = withRetry(
  openAI({ apiKey: process.env.OPENAI_API_KEY }),
  {
    retries: 2,
  }
);

export async function POST(req: NextRequest) {
  // Parse body as unknown, then safely coerce
  const raw: unknown = await req.json();

  let payload: ChatRequest;
  if (isChatRequest(raw)) {
    const model =
      typeof (raw as Record<string, unknown>)?.model === "string"
        ? ((raw as Record<string, unknown>).model as string)
        : "gpt-4o-mini";
    const messages = Array.isArray((raw as Record<string, unknown>)?.messages)
      ? ((raw as Record<string, unknown>).messages as unknown[]).filter(
          isChatMessage
        )
      : [];
    payload = {
      model,
      messages,
    };
  } else {
    // best-effort fallback: accept minimal {model, messages} if present
    const model =
      typeof (raw as Record<string, unknown>)?.model === "string"
        ? ((raw as Record<string, unknown>).model as string)
        : "gpt-4o-mini";
    const messagesRaw = (raw as Record<string, unknown>)?.messages;
    const messages = Array.isArray(messagesRaw)
      ? messagesRaw.filter(isChatMessage)
      : [];
    payload = { model, messages };
  }

  const stream: AsyncIterable<ChatStreamChunk> = provider.streamChat({
    model: payload.model,
    messages: payload.messages,
  });

  return new Response(toSSEStream(stream), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
