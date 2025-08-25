import type {
  Provider,
  ChatRequest,
  ChatStreamChunk,
} from "../../../core/types";
import { sseToIterable } from "../../../core/utils/sse";

export class AnthropicError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AnthropicError";
    this.status = status;
  }
}

export interface AnthropicOptions {
  apiKey: string;
  baseURL?: string; // default: https://api.anthropic.com/v1
  apiVersion?: string; // default: 2023-06-01
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

function isString(x: unknown): x is string {
  return typeof x === "string";
}

function isTextDeltaEvent(e: unknown): e is {
  type: "content_block_delta";
  delta: { type: "text_delta"; text: string };
} {
  if (typeof e !== "object" || e === null) return false;
  const r = e as Record<string, unknown>;
  if (r.type !== "content_block_delta") return false;
  const d = r.delta as Record<string, unknown> | undefined;
  return !!d && d.type === "text_delta" && isString(d.text);
}

function toAnthropicPayload(req: ChatRequest) {
  const system: string[] = [];
  const messages: Array<{
    role: "user" | "assistant";
    content: Array<{ type: "text"; text: string }>;
  }> = [];
  for (const m of req.messages ?? []) {
    if (m.role === "system") system.push(m.content);
    if (m.role === "user" || m.role === "assistant") {
      messages.push({
        role: m.role,
        content: [{ type: "text", text: m.content }],
      });
    }
  }
  return {
    system: system.length ? system.join("\n") : undefined,
    messages,
    model: req.model,
    max_tokens: 1024,
    stream: true as const,
  };
}

function parseStatus(err: unknown): number {
  if (typeof err === "object" && err !== null) {
    if (
      "status" in err &&
      typeof (err as { status?: unknown }).status === "number"
    )
      return (err as { status: number }).status;
    if (
      "statusCode" in err &&
      typeof (err as { statusCode?: unknown }).statusCode === "number"
    )
      return (err as { statusCode: number }).statusCode;
    if ("code" in err && typeof (err as { code?: unknown }).code === "number")
      return (err as { code: number }).code;
  }
  return 500;
}

// ---- provider

export function anthropic(opts: AnthropicOptions): Provider {
  const baseURL = opts.baseURL ?? "https://api.anthropic.com/v1";
  const apiVersion = opts.apiVersion ?? "2023-06-01";
  const doFetch = opts.fetch ?? fetch;

  return {
    async *streamChat(
      req: ChatRequest,
      signal?: AbortSignal
    ): AsyncIterable<ChatStreamChunk> {
      const res = await doFetch(`${baseURL}/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": opts.apiKey,
          "anthropic-version": apiVersion,
        },
        body: JSON.stringify(toAnthropicPayload(req)),
        signal,
      });

      if (!res.ok) {
        let msg = `Anthropic error: ${res.status}`;
        try {
          const raw: unknown = await res.json();
          if (
            typeof raw === "object" &&
            raw !== null &&
            "error" in raw &&
            typeof (raw as { error?: unknown }).error === "object" &&
            typeof (raw as { error: { message?: unknown } }).error?.message ===
              "string"
          ) {
            msg = `Anthropic error ${res.status}: ${(raw as { error: { message: string } }).error.message}`;
          }
        } catch {
          /* ignore */
        }
        throw new AnthropicError(msg, res.status);
      }

      try {
        for await (const data of sseToIterable(res)) {
          let ev: unknown;
          try {
            ev = JSON.parse(data);
          } catch {
            continue;
          }
          if (isTextDeltaEvent(ev)) {
            yield { delta: (ev as { delta: { text: string } }).delta.text };
          }
        }
        yield { delta: "", done: true };
      } catch (err) {
        const status = parseStatus(err);
        const message =
          err instanceof Error ? err.message : "Anthropic streaming error";
        throw new AnthropicError(message, status);
      }
    },
  };
}
