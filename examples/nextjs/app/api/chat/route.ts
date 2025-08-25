import { NextRequest } from "next/server";
import { openAI, withRetry, type ChatRequest } from "@tetherai/openai";

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

/** Narrow only to "is async iterable" — no provider types here */
function isAsyncIterable(x: unknown): x is AsyncIterable<unknown> {
  return (
    typeof x === "object" &&
    x !== null &&
    Symbol.asyncIterator in (x as Record<PropertyKey, unknown>) &&
    typeof (x as Record<PropertyKey, unknown>)[Symbol.asyncIterator] ===
      "function"
  );
}

/** SSE helper that accepts AsyncIterable<unknown> (strict + no any) */
function toSSEStream(iterable: AsyncIterable<unknown>) {
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

export async function POST(req: NextRequest) {
  // Read API key at request time (Edge-safe) and initialize provider
  const apiKey = process.env.OPENAI_API_KEY;
  if (typeof apiKey !== "string" || apiKey.length === 0) {
    return new Response(
      JSON.stringify({ error: "Missing OPENAI_API_KEY server env" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const provider = withRetry(openAI({ apiKey }), { retries: 2 });

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
    payload = { model, messages };
  } else {
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

  const stream = provider.streamChat({
    model: payload.model,
    messages: payload.messages,
  });

  if (!isAsyncIterable(stream)) {
    return new Response(
      JSON.stringify({ error: "Internal: invalid chat stream" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(toSSEStream(stream), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
