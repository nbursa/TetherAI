import { ChatRequest, ChatResponse, ChatStreamChunk, Provider } from "./types";
import { LocalLLMOptions, LocalLLMError } from "./types";
import { sseToIterable } from "./sse";

// Helper function to check if response is a Local LLM error
function isLocalLLMErrorBody(
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
  if (err instanceof LocalLLMError) return err.status;
  if (err instanceof Error && "status" in err)
    return (err as LocalLLMError).status;
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

export function localLLM(opts: LocalLLMOptions): Provider {
  const {
    baseURL,
    timeout = 30000,
    apiKey,
  } = {
    ...opts,
  };

  if (!baseURL) {
    throw new Error("Local LLM baseURL is required");
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
        // Prepare request body (OpenAI-compatible format for local endpoints)
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

        // Prepare headers
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (apiKey) {
          headers.Authorization = `Bearer ${apiKey}`;
        }

        const res = await doFetch(`${baseURL}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
          signal: signal || controller.signal,
          timeout,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          let message = `Local LLM error: ${res.status}`;
          try {
            const raw: unknown = await res.json();
            if (
              isLocalLLMErrorBody(raw) &&
              typeof raw.error?.message === "string"
            ) {
              message = `Local LLM error ${res.status}: ${raw.error.message}`;
            }
          } catch {
            // ignore parse errors
          }
          throw new LocalLLMError(message, res.status);
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
            err instanceof Error ? err.message : "Local LLM streaming error";
          throw new LocalLLMError(message, status);
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

        // Prepare headers
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (apiKey) {
          headers.Authorization = `Bearer ${apiKey}`;
        }

        const res = await doFetch(`${baseURL}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
          signal: signal || controller.signal,
          timeout,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          let message = `Local LLM error: ${res.status}`;
          try {
            const raw: unknown = await res.json();
            if (
              isLocalLLMErrorBody(raw) &&
              typeof raw.error?.message === "string"
            ) {
              message = `Local LLM error ${res.status}: ${raw.error.message}`;
            }
          } catch {
            // ignore parse errors
          }
          throw new LocalLLMError(message, res.status);
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
        const headers: Record<string, string> = {};
        if (apiKey) {
          headers.Authorization = `Bearer ${apiKey}`;
        }

        const res = await doFetch(`${baseURL}/models`, {
          headers,
          signal: AbortSignal.timeout(timeout),
          timeout,
        });

        if (!res.ok) {
          throw new LocalLLMError(
            `Failed to fetch models: ${res.status}`,
            res.status
          );
        }

        const data = await res.json();
        return data.data?.map((model: { id: string }) => model.id) || [];
      } catch (error) {
        if (error instanceof LocalLLMError) throw error;
        throw new LocalLLMError(`Failed to fetch models: ${error}`, 500);
      }
    },

    // Validate model ID (always true for local models)
    validateModel(modelId: string): boolean {
      // Local models can have any name, so we accept all
      // Using modelId to avoid linter warning
      return modelId.length > 0;
    },

    // Get max tokens for model (default for local models)
    getMaxTokens(modelId: string): number {
      // Modern local models have much larger context windows
      if (modelId.includes("llama3") || modelId.includes("llama-3"))
        return 8192;
      if (modelId.includes("llama2") || modelId.includes("llama-2"))
        return 4096;
      if (modelId.includes("codellama")) return 16384;
      if (modelId.includes("mistral")) return 8192;
      if (modelId.includes("gpt")) return 4096;
      if (modelId.includes("qwen")) return 32768;
      if (modelId.includes("yi")) return 16384;
      if (modelId.includes("gemma")) return 8192;
      if (modelId.includes("phi")) return 2048;
      return 32768; // Default to large context for modern models
    },
  };
}
