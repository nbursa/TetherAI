import type { Provider, ChatRequest, ChatStreamChunk } from "../types";

export interface RetryOptions {
  retries?: number;
  baseMs?: number;
  factor?: number;
  jitter?: boolean;
}

function isTransientError(e: unknown): boolean {
  // using type-guard with optional chaining and type narrowing
  const status: number | null =
    (typeof e === "object" &&
      e !== null &&
      "status" in e &&
      typeof (e as { status?: unknown }).status === "number" &&
      (e as { status: number }).status) ||
    (typeof e === "object" &&
      e !== null &&
      "statusCode" in e &&
      typeof (e as { statusCode?: unknown }).statusCode === "number" &&
      (e as { statusCode: number }).statusCode) ||
    (typeof e === "object" &&
      e !== null &&
      "code" in e &&
      typeof (e as { code?: unknown }).code === "number" &&
      (e as { code: number }).code) ||
    null;

  if (typeof status === "number") {
    return status === 429 || status >= 500;
  }
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function withRetry(
  provider: Provider,
  opts: RetryOptions = {}
): Provider {
  const retries = opts.retries ?? 2;
  const baseMs = opts.baseMs ?? 300;
  const factor = opts.factor ?? 2;
  const jitter = opts.jitter ?? true;

  return {
    async *streamChat(
      req: ChatRequest,
      signal?: AbortSignal
    ): AsyncIterable<ChatStreamChunk> {
      let attempt = 0;

      while (true) {
        try {
          for await (const chunk of provider.streamChat(req, signal)) {
            yield chunk;
          }
          return;
        } catch (e) {
          attempt += 1;
          if (attempt > retries || !isTransientError(e) || signal?.aborted) {
            throw e;
          }

          const delay = baseMs * Math.pow(factor, attempt - 1);
          const wait = jitter
            ? Math.floor(delay * (0.8 + Math.random() * 0.4))
            : delay;

          await sleep(wait);
        }
      }
    },
  };
}
