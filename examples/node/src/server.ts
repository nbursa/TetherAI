import { createServer } from "http";
import {
  openAI,
  withRetry,
  type ChatRequest,
  type ChatStreamChunk,
} from "@tetherai/openai";
import "dotenv/config";

/** Type guards to safely parse incoming JSON */
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

function toChatRequest(u: unknown): ChatRequest {
  const safe =
    typeof u === "object" && u !== null ? (u as Record<string, unknown>) : {};
  const model = typeof safe.model === "string" ? safe.model : "gpt-4o-mini";
  const rawMsgs = (safe as { messages?: unknown }).messages;
  const messages = Array.isArray(rawMsgs)
    ? rawMsgs.filter(isChatMessage)
    : [{ role: "user", content: "Hello!" }];
  return { model, messages } as ChatRequest;
}

const apiKey = process.env.OPENAI_API_KEY;
const provider = apiKey ? withRetry(openAI({ apiKey }), { retries: 2 }) : null;

function toSSE(
  iter: AsyncIterable<ChatStreamChunk>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      for await (const chunk of iter) {
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }
      ctrl.enqueue(
        encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
      );
      ctrl.close();
    },
  });
  return stream;
}

const server = createServer((req, res) => {
  void (async () => {
    if (req.method === "POST" && req.url === "/chat") {
      if (!provider) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error:
              "Missing OPENAI_API_KEY. Set it in your environment to use /chat.",
          })
        );
        return;
      }
      let body = "";
      for await (const c of req) body += c;

      let parsed: unknown;
      try {
        parsed = JSON.parse(body) as unknown;
      } catch {
        parsed = {};
      }
      const payload: ChatRequest = toChatRequest(parsed);

      const stream = toSSE(provider.streamChat(payload));
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });

      // Pipe WebStream -> Node response without any casts
      const reader = stream.getReader();
      const pump = async (): Promise<void> => {
        const { value, done } = await reader.read();
        if (done) {
          res.end();
          return;
        }
        if (value) res.write(value);
        void pump();
      };
      void pump();
      return;
    }

    // basic info
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    res.end("POST /chat for SSE stream\n");
  })();
});

const port = Number(process.env.PORT ?? 8787);
server.listen(port, () => {
  console.log(`Node example running on http://localhost:${port}`);
});
