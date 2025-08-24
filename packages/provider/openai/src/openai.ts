import { ChatRequest, ChatStreamChunk, Provider } from "./types";
import { sseToIterable } from "./utils/sse";

export class OpenAIError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenAIError";
    this.status = status;
  }
}

export interface OpenAIOptions {
  apiKey: string;
  baseURL?: string; // defaults to https://api.openai.com/v1
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

// OpenAI Chat Completions streaming provider
export function openAI(opts: OpenAIOptions): Provider {
  const baseURL = opts.baseURL ?? "https://api.openai.com/v1";
  const doFetch = opts.fetch ?? fetch;

  return {
    async *streamChat(
      req: ChatRequest,
      signal?: AbortSignal
    ): AsyncIterable<ChatStreamChunk> {
      const res = await doFetch(`${baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${opts.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...req, stream: true }),
        signal,
      });

      if (!res.ok) {
        let message = `OpenAI error: ${res.status}`;
        try {
          const err = await res.json();
          if (err?.error?.message) {
            message = `OpenAI error ${res.status}: ${err.error.message}`;
          }
        } catch {
          // ignore
        }
        throw new OpenAIError(message, res.status);
      }

      // Parse SSE stream
      for await (const data of sseToIterable(res)) {
        if (data === "[DONE]") {
          yield { delta: "", done: true };
          break;
        }
        try {
          const json = JSON.parse(data);
          const delta = json?.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            yield { delta };
          }
        } catch {
          // ignore keep-alive or non-JSON lines
        }
      }
    },
  };
}
