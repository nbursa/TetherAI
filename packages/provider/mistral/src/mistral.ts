import {
  ChatRequest,
  ChatStreamChunk,
  ChatResponse,
  Provider,
  MistralOptions,
  MistralError,
} from "./types";
import { sseToIterable } from "./sse";

interface MistralErrorBody {
  error?: { message?: string };
}

function isMistralErrorBody(x: unknown): x is MistralErrorBody {
  return (
    typeof x === "object" &&
    x !== null &&
    "error" in x &&
    typeof (x as { error?: unknown }).error === "object"
  );
}

interface MistralStreamJSON {
  choices?: Array<{
    delta?: { content?: string };
    finish_reason?: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }>;
}

function getDeltaContent(x: unknown): string {
  if (
    typeof x === "object" &&
    x !== null &&
    "choices" in x &&
    Array.isArray((x as { choices: unknown }).choices)
  ) {
    const choices = (x as MistralStreamJSON).choices;
    const delta = choices?.[0]?.delta?.content;
    return typeof delta === "string" ? delta : "";
  }
  return "";
}

// Mistral AI Chat Completions streaming provider
export function mistral(opts: MistralOptions): Provider {
  const baseURL = opts.baseURL ?? "https://api.mistral.ai/v1";
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
        // Prepare request body with enhanced options
        const requestBody: Record<string, unknown> = {
          model: req.model,
          messages: req.messages,
          stream: true,
        };

        // Add enhanced chat options
        if (req.safeMode !== undefined) requestBody.safe_mode = req.safeMode;
        if (req.temperature !== undefined)
          requestBody.temperature = req.temperature;
        if (req.maxTokens !== undefined) requestBody.max_tokens = req.maxTokens;
        if (req.topP !== undefined) requestBody.top_p = req.topP;
        if (req.frequencyPenalty !== undefined)
          requestBody.frequency_penalty = req.frequencyPenalty;
        if (req.presencePenalty !== undefined)
          requestBody.presence_penalty = req.presencePenalty;
        if (req.stop !== undefined) requestBody.stop = req.stop;
        if (req.responseFormat !== undefined)
          requestBody.response_format = { type: req.responseFormat };
        if (req.user !== undefined) requestBody.user = req.user;

        // Handle system prompt if provided
        if (
          req.systemPrompt &&
          !req.messages.some((m) => m.role === "system")
        ) {
          requestBody.messages = [
            { role: "system", content: req.systemPrompt },
            ...req.messages,
          ];
        }

        const res = await doFetch(`${baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${opts.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: signal || controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          let message = `Mistral error: ${res.status}`;
          try {
            const raw: unknown = await res.json();
            if (
              isMistralErrorBody(raw) &&
              typeof raw.error?.message === "string"
            ) {
              message = `Mistral error ${res.status}: ${raw.error.message}`;
            }
          } catch {
            // ignore parse errors
          }
          throw new MistralError(message, res.status);
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
        };

        // Add enhanced chat options
        if (req.safeMode !== undefined) requestBody.safe_mode = req.safeMode;
        if (req.temperature !== undefined)
          requestBody.temperature = req.temperature;
        if (req.maxTokens !== undefined) requestBody.max_tokens = req.maxTokens;
        if (req.topP !== undefined) requestBody.top_p = req.topP;
        if (req.frequencyPenalty !== undefined)
          requestBody.frequency_penalty = req.frequencyPenalty;
        if (req.presencePenalty !== undefined)
          requestBody.presence_penalty = req.presencePenalty;
        if (req.stop !== undefined) requestBody.stop = req.stop;
        if (req.responseFormat !== undefined)
          requestBody.response_format = { type: req.responseFormat };
        if (req.user !== undefined) requestBody.user = req.user;

        // Handle system prompt if provided
        if (
          req.systemPrompt &&
          !req.messages.some((m) => m.role === "system")
        ) {
          requestBody.messages = [
            { role: "system", content: req.systemPrompt },
            ...req.messages,
          ];
        }

        const res = await doFetch(`${baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${opts.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: signal || controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          let message = `Mistral error: ${res.status}`;
          try {
            const raw: unknown = await res.json();
            if (
              isMistralErrorBody(raw) &&
              typeof raw.error?.message === "string"
            ) {
              message = `Mistral error ${res.status}: ${raw.error.message}`;
            }
          } catch {
            // ignore parse errors
          }
          throw new MistralError(message, res.status);
        }

        const data = await res.json();
        const choice = data.choices?.[0];

        return {
          content: choice?.message?.content || "",
          model: data.model || req.model,
          usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0,
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
            Authorization: `Bearer ${opts.apiKey}`,
          },
          signal: AbortSignal.timeout(timeout),
        });

        if (!res.ok) {
          throw new MistralError(
            `Failed to fetch models: ${res.status}`,
            res.status
          );
        }

        const data = await res.json();
        return data.data?.map((model: { id: string }) => model.id) || [];
      } catch (error) {
        // Temporarily disable instanceof check to debug test issue
        // if (error instanceof Error && error.name === "MistralError")
        //   throw error;
        throw new MistralError(`Failed to fetch models: ${error}`, 500);
      }
    },

    // Validate model ID
    validateModel(modelId: string): boolean {
      const validModels = [
        "mistral-large-latest",
        "mistral-medium-latest",
        "mistral-small-latest",
        "mistral-7b-instruct",
        "mistral-7b-instruct-v0.2",
        "mistral-7b-instruct-v0.3",
        "open-mistral-7b",
        "open-mixtral-8x7b",
        "open-mixtral-8x22b",
      ];
      return validModels.some((model) => modelId.startsWith(model));
    },

    // Get max tokens for model
    getMaxTokens(modelId: string): number {
      if (modelId.includes("large")) return 32768;
      if (modelId.includes("medium")) return 16384;
      if (modelId.includes("small")) return 8192;
      if (modelId.includes("mixtral-8x22b")) return 65536;
      if (modelId.includes("mixtral-8x7b")) return 32768;
      if (modelId.includes("7b")) return 8192;
      return 4096; // default
    },
  };
}
