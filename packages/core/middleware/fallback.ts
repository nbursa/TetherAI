import type { Provider, ChatRequest, ChatStreamChunk } from "../types";

export interface FallbackOptions {
  onFallback?: (error: unknown, index: number) => void;
}

// Wrap multiple providers and try each until one succeeds
export function withFallback(
  providers: Provider[],
  opts: FallbackOptions = {}
): Provider {
  if (providers.length === 0) {
    throw new Error("withFallback requires at least one provider");
  }

  return {
    async *streamChat(
      req: ChatRequest,
      signal?: AbortSignal
    ): AsyncIterable<ChatStreamChunk> {
      let lastError: unknown;
      for (let i = 0; i < providers.length; i++) {
        try {
          for await (const chunk of providers[i].streamChat(req, signal)) {
            yield chunk;
          }
          return;
        } catch (e) {
          lastError = e;
          opts.onFallback?.(e, i);
          // continue to next provider
        }
      }
      throw lastError;
    },
  };
}
