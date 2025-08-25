import { ChatRequest, ChatStreamChunk, Provider } from "../../../core/types";
import { sseToIterable } from "../../../core/utils/sse";

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

interface OpenAIErrorBody {
  error?: { message?: string };
}

function isOpenAIErrorBody(x: unknown): x is OpenAIErrorBody {
  return (
    typeof x === "object" &&
    x !== null &&
    "error" in x &&
    typeof (x as { error?: unknown }).error === "object"
  );
}

interface OpenAIStreamJSON {
  choices?: Array<{
    delta?: { content?: string };
  }>;
}

function getDeltaContent(x: unknown): string {
  if (
    typeof x === "object" &&
    x !== null &&
    "choices" in x &&
    Array.isArray((x as { choices: unknown }).choices)
  ) {
    const choices = (x as OpenAIStreamJSON).choices;
    const delta = choices?.[0]?.delta?.content;
    return typeof delta === "string" ? delta : "";
  }
  return "";
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
          const raw: unknown = await res.json();
          if (
            isOpenAIErrorBody(raw) &&
            typeof raw.error?.message === "string"
          ) {
            message = `OpenAI error ${res.status}: ${raw.error.message}`;
          }
        } catch {
          // ignore parse errors
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
          const json: unknown = JSON.parse(data);
          const delta = getDeltaContent(json);
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
