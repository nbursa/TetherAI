import {
  Provider,
  ChatRequest,
  ChatStreamChunk,
  ChatResponse,
  AnthropicOptions,
  AnthropicError,
} from "./types";
import { sseToIterable } from "./sse";

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

  // Handle system prompt if provided
  if (req.systemPrompt) {
    system.push(req.systemPrompt);
  }

  for (const m of req.messages ?? []) {
    if (m.role === "system") system.push(m.content);
    if (m.role === "user" || m.role === "assistant") {
      messages.push({
        role: m.role,
        content: [{ type: "text", text: m.content }],
      });
    }
  }

  const payload: Record<string, unknown> = {
    system: system.length ? system.join("\n") : undefined,
    messages,
    model: req.model,
    stream: true as const,
  };

  // Add enhanced chat options
  if (req.temperature !== undefined) payload.temperature = req.temperature;
  if (req.maxTokens !== undefined) payload.max_tokens = req.maxTokens;
  if (req.topP !== undefined) payload.top_p = req.topP;
  if (req.topK !== undefined) payload.top_k = req.topK;
  if (req.stop !== undefined) payload.stop_sequences = req.stop;
  if (req.logitBias !== undefined) payload.logit_bias = req.logitBias;
  // No direct user field; handled below

  if (req.responseFormat !== undefined)
    payload.response_format = { type: req.responseFormat };
  if (req.metadata !== undefined || req.user !== undefined) {
    payload.metadata = {
      ...(req.metadata as Record<string, unknown> | undefined),
    };
    if (req.user !== undefined) {
      (payload.metadata as Record<string, unknown>).user = req.user;
    }
  }

  return payload;
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
  const timeout = opts.timeout ?? 30000;

  return {
    async *streamChat(
      req: ChatRequest,
      signal?: AbortSignal
    ): AsyncIterable<ChatStreamChunk> {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const res = await doFetch(`${baseURL}/messages`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": opts.apiKey,
            "anthropic-version": apiVersion,
            ...(opts.beta ? { "anthropic-beta": opts.beta } : {}),
          },
          body: JSON.stringify(toAnthropicPayload(req)),
          signal: signal || controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          let msg = `Anthropic error: ${res.status}`;
          try {
            const raw: unknown = await res.json();
            if (
              typeof raw === "object" &&
              raw !== null &&
              "error" in raw &&
              typeof (raw as { error?: unknown }).error === "object" &&
              typeof (raw as { error: { message?: unknown } }).error
                ?.message === "string"
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
              if (isTextDeltaEvent(ev)) {
                yield { delta: (ev as { delta: { text: string } }).delta.text };
              }
            } catch {
              continue;
            }
          }
          yield { delta: "", done: true };
        } catch (err) {
          const status = parseStatus(err);
          const message =
            err instanceof Error ? err.message : "Anthropic streaming error";
          throw new AnthropicError(message, status);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    },

    // Non-streaming chat
    async chat(req: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        // Prepare request body (similar to streamChat but without stream: true)
        const payload = toAnthropicPayload(req);
        payload.stream = false;

        const res = await doFetch(`${baseURL}/messages`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": opts.apiKey,
            "anthropic-version": apiVersion,
            ...(opts.beta ? { "anthropic-beta": opts.beta } : {}),
          },
          body: JSON.stringify(payload),
          signal: signal || controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          let msg = `Anthropic error: ${res.status}`;
          try {
            const raw: unknown = await res.json();
            if (
              typeof raw === "object" &&
              raw !== null &&
              "error" in raw &&
              typeof (raw as { error?: unknown }).error === "object" &&
              typeof (raw as { error: { message?: unknown } }).error
                ?.message === "string"
            ) {
              msg = `Anthropic error ${res.status}: ${(raw as { error: { message: string } }).error.message}`;
            }
          } catch {
            /* ignore */
          }
          throw new AnthropicError(msg, res.status);
        }

        const data = await res.json();
        const content = data.content?.[0]?.text || "";

        return {
          content,
          model: data.model || req.model,
          usage: data.usage
            ? {
                promptTokens: data.usage.input_tokens || 0,
                completionTokens: data.usage.output_tokens || 0,
                totalTokens:
                  (data.usage.input_tokens || 0) +
                  (data.usage.output_tokens || 0),
              }
            : {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
              },
          finishReason: data.stop_reason || "stop",
          metadata: { id: data.id, type: data.type },
        };
      } finally {
        clearTimeout(timeoutId);
      }
    },

    // Get available models
    async getModels(): Promise<string[]> {
      try {
        const res = await doFetch(`${baseURL}/models`, {
          headers: {
            "x-api-key": opts.apiKey,
            "anthropic-version": apiVersion,
          },
          signal: AbortSignal.timeout(timeout),
        });

        if (!res.ok) {
          throw new AnthropicError(
            `Failed to fetch models: ${res.status}`,
            res.status
          );
        }

        const data = await res.json();
        return data.data?.map((model: { id: string }) => model.id) || [];
      } catch (error) {
        if (error instanceof AnthropicError) throw error;
        throw new AnthropicError(`Failed to fetch models: ${error}`, 500);
      }
    },

    // Validate model ID
    validateModel(modelId: string): boolean {
      const validModels = [
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
        "claude-3-opus-20240229",
        "claude-3-sonnet-20240229",
        "claude-3-haiku-20240307",
        "claude-2.1",
        "claude-2.0",
        "claude-instant-1.2",
        "claude-instant-1.1",
      ];
      return validModels.some((model) => modelId.startsWith(model));
    },

    // Get max tokens for model
    getMaxTokens(modelId: string): number {
      if (modelId.startsWith("claude-3-5-sonnet")) return 200000;
      if (modelId.startsWith("claude-3-5-haiku")) return 200000;
      if (modelId.startsWith("claude-3-opus")) return 200000;
      if (modelId.startsWith("claude-3-sonnet")) return 200000;
      if (modelId.startsWith("claude-3-haiku")) return 200000;
      if (modelId.startsWith("claude-2")) return 100000;
      if (modelId.startsWith("claude-instant")) return 100000;
      return 100000; // default
    },
  };
}
