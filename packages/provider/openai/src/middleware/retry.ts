import type { Provider, ChatRequest, ChatStreamChunk } from "../types";
import { OpenAIError } from "../openai";

export interface RetryOptions {
  retries?: number; // number of retry attempts
  baseMs?: number; // initial backoff in ms
  factor?: number; // exponential factor
  jitter?: boolean; // add +/- 20% jitter
}

function isTransientError(e: unknown): boolean {
  if (e instanceof OpenAIError) {
    return e.status === 429 || e.status >= 500;
  }
  // Network-like errors often have no status; allow retry once
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
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          for await (const chunk of provider.streamChat(req, signal)) {
            yield chunk;
          }
          return; // success path
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
          // loop to retry
        }
      }
    },
  };
}
