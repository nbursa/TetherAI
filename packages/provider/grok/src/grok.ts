import { ChatRequest, ChatResponse, ChatStreamChunk, Provider } from "./types";
import { GrokOptions, GrokError } from "./types";
import { sseToIterable } from "./sse";

// Helper function to check if response is a Grok error
function isGrokErrorBody(
  raw: unknown
): raw is { error?: { message?: unknown } } {
  return (
    typeof raw === "object" &&
    raw !== null &&
    "error" in raw &&
    typeof (raw as { error?: unknown }).error === "object"
  );
}

// Helper function to parse HTTP status from various error types
function parseStatus(err: unknown): number {
  if (err instanceof GrokError) return err.status;
  if (err instanceof Error && "status" in err) return (err as GrokError).status;
  return 500;
}

// Helper function to create fetch with timeout
async function doFetch(
  url: string,
  options: RequestInit & { timeout?: number }
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export function grok(opts: GrokOptions): Provider {
  const {
    apiKey,
    baseURL = "https://api.x.ai/v1",
    timeout = 30000,
  } = {
    ...opts,
  };

  if (!apiKey) {
    throw new Error("Grok API key is required");
  }

  return {
    // Streaming chat
    async *streamChat(
      req: ChatRequest,
      signal?: AbortSignal
    ): AsyncIterable<ChatStreamChunk> {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        // Prepare request body
        const requestBody: Record<string, unknown> = {
          model: req.model,
          messages: req.messages,
          stream: true,
          temperature: req.temperature ?? 1,
          max_tokens: req.maxTokens,
          top_p: req.topP,
          frequency_penalty: req.frequencyPenalty,
          presence_penalty: req.presencePenalty,
        };

        // Add optional parameters
        if (req.stop) requestBody.stop = req.stop;
        if (req.seed !== undefined) requestBody.seed = req.seed;
        if (req.logitBias !== undefined) requestBody.logit_bias = req.logitBias;
        if (
          req.systemPrompt &&
          !req.messages.some((m) => m.role === "system")
        ) {
          requestBody.messages = [
            { role: "system", content: req.systemPrompt },
            ...req.messages,
          ];
        }
        if (req.responseFormat !== undefined)
          requestBody.response_format = { type: req.responseFormat };

        const res = await doFetch(`${baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: signal || controller.signal,
          timeout,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          let message = `Grok error: ${res.status}`;
          try {
            const raw: unknown = await res.json();
            if (
              isGrokErrorBody(raw) &&
              typeof raw.error?.message === "string"
            ) {
              message = `Grok error ${res.status}: ${raw.error.message}`;
            }
          } catch {
            // ignore parse errors
          }
          throw new GrokError(message, res.status);
        }

        try {
          for await (const data of sseToIterable(res)) {
            if (data === "[DONE]") {
              yield { delta: "", done: true };
              break;
            }

            let ev: unknown;
            try {
              ev = JSON.parse(data);
              if (
                ev &&
                typeof ev === "object" &&
                ev !== null &&
                "choices" in ev
              ) {
                const choices = (
                  ev as { choices?: Array<{ delta?: { content?: string } }> }
                ).choices;
                if (Array.isArray(choices) && choices[0]?.delta?.content) {
                  yield { delta: choices[0].delta.content };
                }
              }
            } catch {
              continue;
            }
          }
        } catch (err) {
          const status = parseStatus(err);
          const message =
            err instanceof Error ? err.message : "Grok streaming error";
          throw new GrokError(message, status);
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
        const requestBody: Record<string, unknown> = {
          model: req.model,
          messages: req.messages,
          temperature: req.temperature ?? 1,
          max_tokens: req.maxTokens,
          top_p: req.topP,
          frequency_penalty: req.frequencyPenalty,
          presence_penalty: req.presencePenalty,
        };

        // Add optional parameters
        if (req.stop) requestBody.stop = req.stop;
        if (req.seed !== undefined) requestBody.seed = req.seed;
        if (req.logitBias !== undefined) requestBody.logit_bias = req.logitBias;
        if (
          req.systemPrompt &&
          !req.messages.some((m) => m.role === "system")
        ) {
          requestBody.messages = [
            { role: "system", content: req.systemPrompt },
            ...req.messages,
          ];
        }
        if (req.responseFormat !== undefined)
          requestBody.response_format = { type: req.responseFormat };

        const res = await doFetch(`${baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: signal || controller.signal,
          timeout,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          let message = `Grok error: ${res.status}`;
          try {
            const raw: unknown = await res.json();
            if (
              isGrokErrorBody(raw) &&
              typeof raw.error?.message === "string"
            ) {
              message = `Grok error ${res.status}: ${raw.error.message}`;
            }
          } catch {
            // ignore parse errors
          }
          throw new GrokError(message, res.status);
        }

        const data = await res.json();
        const choice = data.choices?.[0];

        return {
          content: choice?.message?.content || "",
          model: data.model || req.model,
          usage: data.usage
            ? {
                promptTokens: data.usage.prompt_tokens || 0,
                completionTokens: data.usage.completion_tokens || 0,
                totalTokens: data.usage.total_tokens || 0,
              }
            : {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
              },
          finishReason: choice?.finish_reason || "stop",
          metadata: { id: data.id, created: data.created },
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
            Authorization: `Bearer ${apiKey}`,
          },
          signal: AbortSignal.timeout(timeout),
          timeout,
        });

        if (!res.ok) {
          throw new GrokError(
            `Failed to fetch models: ${res.status}`,
            res.status
          );
        }

        const data = await res.json();
        return data.data?.map((model: { id: string }) => model.id) || [];
      } catch (error) {
        if (error instanceof GrokError) throw error;
        throw new GrokError(`Failed to fetch models: ${error}`, 500);
      }
    },

    // Validate model ID
    validateModel(modelId: string): boolean {
      const validModels = [
        "grok-beta",
        "grok-beta-vision",
        "grok-beta-2",
        "grok-beta-2-vision",
        "grok-2",
        "grok-2-vision",
        "grok-2-mini",
        "grok-2-mini-vision",
      ];
      return validModels.some((model) => modelId.startsWith(model));
    },

    // Get max tokens for model
    getMaxTokens(modelId: string): number {
      if (modelId.includes("vision")) return 128000;
      if (modelId.includes("grok-2")) return 128000;
      if (modelId.includes("beta-2")) return 128000;
      return 8192; // default for grok-beta
    },
  };
}
