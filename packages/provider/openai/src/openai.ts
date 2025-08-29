import {
  ChatRequest,
  ChatStreamChunk,
  ChatResponse,
  Provider,
  OpenAIOptions,
  OpenAIError,
} from "./types";
import { sseToIterable } from "./sse";

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
            ...(opts.organization && {
              "OpenAI-Organization": opts.organization,
            }),
          },
          body: JSON.stringify(requestBody),
          signal: signal || controller.signal,
        });

        clearTimeout(timeoutId);

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
            ...(opts.organization && {
              "OpenAI-Organization": opts.organization,
            }),
          },
          body: JSON.stringify(requestBody),
          signal: signal || controller.signal,
        });

        clearTimeout(timeoutId);

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
            Authorization: `Bearer ${opts.apiKey}`,
            ...(opts.organization && {
              "OpenAI-Organization": opts.organization,
            }),
          },
          signal: AbortSignal.timeout(timeout),
        });

        if (!res.ok) {
          throw new OpenAIError(
            `Failed to fetch models: ${res.status}`,
            res.status
          );
        }

        const data = await res.json();
        return data.data?.map((model: { id: string }) => model.id) || [];
      } catch (error) {
        if (error instanceof OpenAIError) throw error;
        throw new OpenAIError(`Failed to fetch models: ${error}`, 500);
      }
    },

    // Validate model ID
    validateModel(modelId: string): boolean {
      const validModels = [
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4-turbo",
        "gpt-4",
        "gpt-3.5-turbo",
      ];
      return validModels.some((model) => modelId.startsWith(model));
    },

    // Get max tokens for model
    getMaxTokens(modelId: string): number {
      if (modelId.startsWith("gpt-4o")) return 128000;
      if (modelId.startsWith("gpt-4")) return 8192;
      if (modelId.startsWith("gpt-3.5-turbo")) return 16385;
      return 4096; // default
    },
  };
}
