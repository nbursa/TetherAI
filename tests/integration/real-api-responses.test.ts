import { describe, it, expect, vi, beforeEach } from "vitest";
import { openAI } from "../../packages/provider/openai/dist/src/index";
import { anthropic } from "../../packages/provider/anthropic/dist/src/index";
import { mistral } from "../../packages/provider/mistral/dist/src/index";

// Mock fetch to return realistic API responses
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Real API Response Parsing Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("OpenAI Provider", () => {
    it("should parse real OpenAI streaming responses correctly", async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            // Real OpenAI SSE format
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"gpt-4","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}\n\n'
              )
            );
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"gpt-4","choices":[{"index":0,"delta":{"content":" World"},"finish_reason":null}]}\n\n'
              )
            );
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"gpt-4","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n'
              )
            );
            controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            controller.close();
          },
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const provider = openAI({ apiKey: "test-key" });
      const request = {
        model: "gpt-4",
        messages: [{ role: "user" as const, content: "Say hello" }],
      };

      const chunks: unknown[] = [];
      for await (const chunk of provider.streamChat(request)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual({ delta: "Hello" });
      expect(chunks[1]).toEqual({ delta: " World" });
      expect(chunks[2]).toEqual({ delta: "", done: true });
    });

    it("should parse real OpenAI non-streaming responses correctly", async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            id: "chatcmpl-123",
            object: "chat.completion",
            created: 1234567890,
            model: "gpt-4",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: "Hello there! How can I help you today?",
                },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 8,
              total_tokens: 18,
            },
          }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const provider = openAI({ apiKey: "test-key" });
      const request = {
        model: "gpt-4",
        messages: [{ role: "user" as const, content: "Hello" }],
      };

      const response = await provider.chat(request);

      expect(response.content).toBe("Hello there! How can I help you today?");
      expect(response.model).toBe("gpt-4");
      expect(response.usage.promptTokens).toBe(10);
      expect(response.usage.completionTokens).toBe(8);
      expect(response.usage.totalTokens).toBe(18);
      expect(response.finishReason).toBe("stop");
    });

    it("should handle real OpenAI error responses correctly", async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error: {
              message: "The model `gpt-5` does not exist",
              type: "invalid_request_error",
              param: "model",
              code: "model_not_found",
            },
          }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const provider = openAI({ apiKey: "test-key" });
      const request = {
        model: "gpt-5",
        messages: [{ role: "user" as const, content: "Hello" }],
      };

      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const chunk of provider.streamChat(request)) {
          // consume stream
        }
      }).rejects.toThrow("OpenAI error 400: The model `gpt-5` does not exist");
    });
  });

  describe("Anthropic Provider", () => {
    it("should parse real Anthropic streaming responses correctly", async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            // Real Anthropic SSE format
            controller.enqueue(
              new TextEncoder().encode(
                'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_123","type":"message","role":"assistant","content":[],"model":"claude-3-sonnet-20240229","stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":10,"output_tokens":0}}}\n\n'
              )
            );
            controller.enqueue(
              new TextEncoder().encode(
                'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n'
              )
            );
            controller.enqueue(
              new TextEncoder().encode('event: ping\ndata: {"type":"ping"}\n\n')
            );
            controller.enqueue(
              new TextEncoder().encode(
                'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n'
              )
            );
            controller.enqueue(
              new TextEncoder().encode(
                'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" World"}}\n\n'
              )
            );
            controller.enqueue(
              new TextEncoder().encode(
                'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n'
              )
            );
            controller.enqueue(
              new TextEncoder().encode(
                'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":8}}\n\n'
              )
            );
            controller.enqueue(
              new TextEncoder().encode(
                'event: message_stop\ndata: {"type":"message_stop"}\n\n'
              )
            );
            controller.close();
          },
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const provider = anthropic({ apiKey: "test-key" });
      const request = {
        model: "claude-3-sonnet-20240229",
        messages: [{ role: "user" as const, content: "Say hello" }],
      };

      const chunks: unknown[] = [];
      for await (const chunk of provider.streamChat(request)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual({ delta: "Hello" });
      expect(chunks[1]).toEqual({ delta: " World" });
      expect(chunks[2]).toEqual({ delta: "", done: true });
    });
  });

  describe("Mistral Provider", () => {
    it("should parse real Mistral streaming responses correctly", async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            // Real Mistral SSE format
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"mistral-medium-latest","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}\n\n'
              )
            );
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"mistral-medium-latest","choices":[{"index":0,"delta":{"content":" World"},"finish_reason":null}]}\n\n'
              )
            );
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"mistral-medium-latest","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n'
              )
            );
            controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            controller.close();
          },
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const provider = mistral({ apiKey: "test-key" });
      const request = {
        model: "mistral-medium-latest",
        messages: [{ role: "user" as const, content: "Say hello" }],
      };

      const chunks: unknown[] = [];
      for await (const chunk of provider.streamChat(request)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual({ delta: "Hello" });
      expect(chunks[1]).toEqual({ delta: " World" });
      expect(chunks[2]).toEqual({ delta: "", done: true });
    });
  });
});
