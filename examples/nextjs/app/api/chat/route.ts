import { NextRequest } from "next/server";
import {
  openAI,
  withRetry,
  withFallback,
  type ChatRequest,
  type ChatStreamChunk,
} from "@tetherai/provider-openai";

const provider = withFallback(
  [
    withRetry(openAI({ apiKey: process.env.OPENAI_API_KEY! }), {
      retries: 2,
      baseMs: 300,
      factor: 2,
      jitter: true,
    }),
  ],
  { onFallback: (err, idx) => console.warn(`Provider ${idx} failed`, err) }
);

export const runtime = "edge";

function toSSEStream(iterable: AsyncIterable<ChatStreamChunk>) {
  const encoder = new TextEncoder();
  return new ReadableStream({
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
        const err = e instanceof Error ? e.message : "unknown error";
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message: err })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<ChatRequest>;
  const model = body.model ?? "gpt-4o-mini";
  const messages: ChatRequest["messages"] = body.messages ?? [];

  const stream = provider.streamChat({ model, messages });

  return new Response(toSSEStream(stream), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
