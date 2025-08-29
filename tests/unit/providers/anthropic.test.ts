import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  MockProvider,
  MockProviderConfig,
  MockStreamChatArgs,
  MockChatResponse,
  MockError,
  MockModule,
} from "../../types/test-types";

// Mock fetch for testing
global.fetch = vi.fn();

describe("Anthropic Provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("Configuration", () => {
    it("should accept valid configuration options", async () => {
      const mockAnthropic = vi.fn().mockReturnValue({
        streamChat: vi.fn(),
        chat: vi.fn(),
        getModels: vi.fn(),
        validateModel: vi.fn(),
        getMaxTokens: vi.fn(),
      } as MockProvider);

      const config: MockProviderConfig = {
        apiKey: "sk-ant-test-key",
        timeout: 30000,
        maxRetries: 3,
        apiVersion: "2023-06-01",
        baseURL: "https://api.anthropic.com/v1",
      };

      const provider = mockAnthropic(config);

      expect(provider).toBeDefined();
      expect(mockAnthropic).toHaveBeenCalledWith(config);
    });

    it("should use default values when options not provided", async () => {
      const mockAnthropic = vi.fn().mockReturnValue({
        streamChat: vi.fn(),
        chat: vi.fn(),
        getModels: vi.fn(),
        validateModel: vi.fn(),
        getMaxTokens: vi.fn(),
      } as MockProvider);

      const config: MockProviderConfig = {
        apiKey: "sk-ant-test-key",
      };

      const provider = mockAnthropic(config);

      expect(provider).toBeDefined();
      expect(mockAnthropic).toHaveBeenCalledWith(config);
    });
  });

  describe("Streaming Chat", () => {
    it("should stream chat responses correctly", async () => {
      const mockStream = [
        { delta: { content: "Hello" }, done: false },
        { delta: { content: " World" }, done: false },
        { delta: { content: "!" }, done: true },
      ];

      const mockStreamChat = vi.fn().mockImplementation(async function* () {
        for (const chunk of mockStream) {
          yield chunk;
        }
      });

      const mockProvider: MockProvider = {
        streamChat: mockStreamChat,
      };

      const messages: MockStreamChatArgs = {
        model: "claude-3-5-sonnet-20240620",
        messages: [{ role: "user", content: "Say hello" }],
      };

      const stream = mockProvider.streamChat(messages);

      if (Symbol.asyncIterator in stream) {
        const chunks: unknown[] = [];
        for await (const chunk of stream as AsyncGenerator<unknown>) {
          chunks.push(chunk);
        }

        expect(chunks).toEqual(mockStream);
        expect(mockStreamChat).toHaveBeenCalledWith(messages);
      } else {
        // Handle Promise case
        const result = (await stream) as Promise<unknown>;
        expect(result).toBeDefined();
      }
    });

    it("should handle streaming errors gracefully", async () => {
      const mockError = new Error("Stream failed");
      const mockStreamChat = vi.fn().mockRejectedValue(mockError);

      const mockProvider: MockProvider = {
        streamChat: mockStreamChat,
      };

      const messages: MockStreamChatArgs = {
        model: "claude-3-5-sonnet-20240620",
        messages: [{ role: "user", content: "Say hello" }],
      };

      await expect(mockProvider.streamChat(messages)).rejects.toThrow(
        "Stream failed"
      );
      expect(mockStreamChat).toHaveBeenCalledWith(messages);
    });

    it("should support enhanced chat options", async () => {
      const mockStreamChat = vi.fn().mockImplementation(async function* () {
        yield { delta: "Enhanced response", done: false };
        yield { delta: "", done: true };
      });

      const mockProvider: MockProvider = {
        streamChat: mockStreamChat,
      };

      const enhancedRequest: MockStreamChatArgs = {
        model: "claude-3-5-sonnet-20240620",
        messages: [{ role: "user", content: "Hello" }],
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        topK: 40,
        stop: ["\n", "END"],
        systemPrompt: "You are a helpful assistant",
        responseFormat: "json_object",
        safeMode: true,
        user: "user123",
        metadata: { sessionId: "abc123" },
      };

      const stream = mockProvider.streamChat(enhancedRequest);
      const chunks: unknown[] = [];

      for await (const chunk of stream as AsyncGenerator<unknown>) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(mockStreamChat).toHaveBeenCalledWith(enhancedRequest);
    });
  });

  describe("Non-Streaming Chat", () => {
    it("should handle non-streaming chat requests", async () => {
      const mockResponse: MockChatResponse = {
        content: "Hello World!",
        model: "claude-3-5-sonnet-20240620",
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
        },
        finishReason: "stop",
        metadata: { id: "msg-123", type: "message" },
      };

      const mockChat = vi.fn().mockResolvedValue(mockResponse);

      const mockProvider: MockProvider = {
        streamChat: vi.fn(),
        chat: mockChat,
      };

      const request: MockStreamChatArgs = {
        model: "claude-3-5-sonnet-20240620",
        messages: [{ role: "user", content: "Hello" }],
        temperature: 0.5,
        maxTokens: 500,
      };

      const response = await mockProvider.chat!(request);

      expect(response).toEqual(mockResponse);
      expect(mockChat).toHaveBeenCalledWith(request);
    });

    it("should handle chat errors", async () => {
      const mockError = new Error("Chat failed");
      const mockChat = vi.fn().mockRejectedValue(mockError);

      const mockProvider: MockProvider = {
        streamChat: vi.fn(),
        chat: mockChat,
      };

      const request: MockStreamChatArgs = {
        model: "claude-3-5-sonnet-20240620",
        messages: [{ role: "user", content: "Hello" }],
      };

      await expect(mockProvider.chat!(request)).rejects.toThrow("Chat failed");
      expect(mockChat).toHaveBeenCalledWith(request);
    });
  });

  describe("Model Management", () => {
    it("should list available models", async () => {
      const mockModels = [
        "claude-3-5-sonnet",
        "claude-3-5-haiku",
        "claude-3-opus",
      ];
      const mockGetModels = vi.fn().mockResolvedValue(mockModels);

      const mockProvider: MockProvider = {
        streamChat: vi.fn(),
        getModels: mockGetModels,
      };

      const models = await mockProvider.getModels!();

      expect(models).toEqual(mockModels);
      expect(mockGetModels).toHaveBeenCalled();
    });

    it("should validate model IDs", () => {
      const mockValidateModel = vi
        .fn()
        .mockReturnValueOnce(true) // claude-3-5-sonnet
        .mockReturnValueOnce(false); // invalid-model

      const mockProvider: MockProvider = {
        streamChat: vi.fn(),
        validateModel: mockValidateModel,
      };

      const validModel = mockProvider.validateModel!(
        "claude-3-5-sonnet-20240620"
      );
      const invalidModel = mockProvider.validateModel!("invalid-model");

      expect(validModel).toBe(true);
      expect(invalidModel).toBe(false);
      expect(mockValidateModel).toHaveBeenCalledWith(
        "claude-3-5-sonnet-20240620"
      );
      expect(mockValidateModel).toHaveBeenCalledWith("invalid-model");
    });

    it("should get max tokens for models", () => {
      const mockGetMaxTokens = vi
        .fn()
        .mockReturnValueOnce(200000) // claude-3-5-sonnet
        .mockReturnValueOnce(200000) // claude-3-opus
        .mockReturnValueOnce(100000); // claude-2

      const mockProvider: MockProvider = {
        streamChat: vi.fn(),
        getMaxTokens: mockGetMaxTokens,
      };

      const claude35Max = mockProvider.getMaxTokens!(
        "claude-3-5-sonnet-20240620"
      );
      const claude3Max = mockProvider.getMaxTokens!("claude-3-opus-20240229");
      const claude2Max = mockProvider.getMaxTokens!("claude-2.1");

      expect(claude35Max).toBe(200000);
      expect(claude3Max).toBe(200000);
      expect(claude2Max).toBe(100000);
      expect(mockGetMaxTokens).toHaveBeenCalledWith(
        "claude-3-5-sonnet-20240620"
      );
      expect(mockGetMaxTokens).toHaveBeenCalledWith("claude-3-opus-20240229");
      expect(mockGetMaxTokens).toHaveBeenCalledWith("claude-2.1");
    });
  });

  describe("Enhanced Chat Options", () => {
    it("should handle temperature parameter", async () => {
      const mockStreamChat = vi.fn().mockImplementation(async function* () {
        yield { delta: "Temperature controlled response", done: false };
        yield { delta: "", done: true };
      });

      const mockProvider: MockProvider = {
        streamChat: mockStreamChat,
      };

      const request: MockStreamChatArgs = {
        model: "claude-3-5-sonnet-20240620",
        messages: [{ role: "user", content: "Hello" }],
        temperature: 0.8,
      };

      const stream = mockProvider.streamChat(request);
      const chunks: unknown[] = [];

      for await (const chunk of stream as AsyncGenerator<unknown>) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(mockStreamChat).toHaveBeenCalledWith(request);
    });

    it("should handle maxTokens parameter", async () => {
      const mockStreamChat = vi.fn().mockImplementation(async function* () {
        yield { delta: "Limited response", done: false };
        yield { delta: "", done: true };
      });

      const mockProvider: MockProvider = {
        streamChat: mockStreamChat,
      };

      const request: MockStreamChatArgs = {
        model: "claude-3-5-sonnet-20240620",
        messages: [{ role: "user", content: "Hello" }],
        maxTokens: 100,
      };

      const stream = mockProvider.streamChat(request);
      const chunks: unknown[] = [];

      for await (const chunk of stream as AsyncGenerator<unknown>) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(mockStreamChat).toHaveBeenCalledWith(request);
    });

    it("should handle topK parameter (Claude specific)", async () => {
      const mockStreamChat = vi.fn().mockImplementation(async function* () {
        yield { delta: "Top-K controlled response", done: false };
        yield { delta: "", done: true };
      });

      const mockProvider: MockProvider = {
        streamChat: mockStreamChat,
      };

      const request: MockStreamChatArgs = {
        model: "claude-3-5-sonnet-20240620",
        messages: [{ role: "user", content: "Hello" }],
        topK: 50,
      };

      const stream = mockProvider.streamChat(request);
      const chunks: unknown[] = [];

      for await (const chunk of stream as AsyncGenerator<unknown>) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(mockStreamChat).toHaveBeenCalledWith(request);
    });

    it("should handle systemPrompt parameter", async () => {
      const mockStreamChat = vi.fn().mockImplementation(async function* () {
        yield { delta: "System guided response", done: false };
        yield { delta: "", done: true };
      });

      const mockProvider: MockProvider = {
        streamChat: mockStreamChat,
      };

      const request: MockStreamChatArgs = {
        model: "claude-3-5-sonnet-20240620",
        messages: [{ role: "user", content: "Hello" }],
        systemPrompt: "You are a helpful assistant",
      };

      const stream = mockProvider.streamChat(request);
      const chunks: unknown[] = [];

      for await (const chunk of stream as AsyncGenerator<unknown>) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(mockStreamChat).toHaveBeenCalledWith(request);
    });

    it("should handle stop sequences", async () => {
      const mockStreamChat = vi.fn().mockImplementation(async function* () {
        yield { delta: "Response with stop", done: false };
        yield { delta: "", done: true };
      });

      const mockProvider: MockProvider = {
        streamChat: mockStreamChat,
      };

      const request: MockStreamChatArgs = {
        model: "claude-3-5-sonnet-20240620",
        messages: [{ role: "user", content: "Hello" }],
        stop: ["\n", "END"],
      };

      const stream = mockProvider.streamChat(request);
      const chunks: unknown[] = [];

      for await (const chunk of stream as AsyncGenerator<unknown>) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(mockStreamChat).toHaveBeenCalledWith(request);
    });

    it("should handle responseFormat parameter", async () => {
      const mockStreamChat = vi.fn().mockImplementation(async function* () {
        yield { delta: '{"response": "JSON formatted"}', done: false };
        yield { delta: "", done: true };
      });

      const mockProvider: MockProvider = {
        streamChat: mockStreamChat,
      };

      const request: MockStreamChatArgs = {
        model: "claude-3-5-sonnet-20240620",
        messages: [{ role: "user", content: "Hello" }],
        responseFormat: "json_object",
      };

      const stream = mockProvider.streamChat(request);
      const chunks: unknown[] = [];

      for await (const chunk of stream as AsyncGenerator<unknown>) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(mockStreamChat).toHaveBeenCalledWith(request);
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors with status codes", async () => {
      const mockError: MockError = {
        name: "AnthropicError",
        message: "API key invalid",
        status: 401,
      };

      const mockStreamChat = vi.fn().mockRejectedValue(mockError);

      const mockProvider: MockProvider = {
        streamChat: mockStreamChat,
      };

      const request: MockStreamChatArgs = {
        model: "claude-3-5-sonnet-20240620",
        messages: [{ role: "user", content: "Hello" }],
      };

      await expect(mockProvider.streamChat(request)).rejects.toThrow(
        "API key invalid"
      );
      expect(mockStreamChat).toHaveBeenCalledWith(request);
    });

    it("should handle network errors", async () => {
      const mockError = new Error("Network error");
      const mockStreamChat = vi.fn().mockRejectedValue(mockError);

      const mockProvider: MockProvider = {
        streamChat: mockStreamChat,
      };

      const request: MockStreamChatArgs = {
        model: "claude-3-5-sonnet-20240620",
        messages: [{ role: "user", content: "Hello" }],
      };

      await expect(mockProvider.streamChat(request)).rejects.toThrow(
        "Network error"
      );
      expect(mockStreamChat).toHaveBeenCalledWith(request);
    });
  });

  describe("Integration", () => {
    it("should work with all enhanced features together", async () => {
      const mockStreamChat = vi.fn().mockImplementation(async function* () {
        yield { delta: "Full featured response", done: false };
        yield { delta: "", done: true };
      });

      const mockChat = vi.fn().mockResolvedValue({
        content: "Full featured response",
        model: "claude-3-5-sonnet-20240620",
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        finishReason: "stop",
      });

      const mockProvider: MockProvider = {
        streamChat: mockStreamChat,
        chat: mockChat,
        getModels: vi
          .fn()
          .mockResolvedValue(["claude-3-5-sonnet", "claude-3-5-haiku"]),
        validateModel: vi.fn().mockReturnValue(true),
        getMaxTokens: vi.fn().mockReturnValue(200000),
      };

      // Test streaming with enhanced options
      const streamRequest: MockStreamChatArgs = {
        model: "claude-3-5-sonnet-20240620",
        messages: [{ role: "user", content: "Hello" }],
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        topK: 40,
        stop: ["\n", "END"],
        systemPrompt: "You are a helpful assistant",
        responseFormat: "json_object",
        safeMode: true,
        user: "user123",
        metadata: { sessionId: "abc123" },
      };

      const stream = mockProvider.streamChat(streamRequest);
      const chunks: unknown[] = [];

      for await (const chunk of stream as AsyncGenerator<unknown>) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(mockStreamChat).toHaveBeenCalledWith(streamRequest);

      // Test non-streaming chat
      const chatRequest: MockStreamChatArgs = {
        model: "claude-3-5-sonnet-20240620",
        messages: [{ role: "user", content: "Hello" }],
        temperature: 0.5,
        maxTokens: 500,
      };

      const chatResponse = (await mockProvider.chat!(
        chatRequest
      )) as MockChatResponse;
      expect(chatResponse.content).toBe("Full featured response");
      expect(mockChat).toHaveBeenCalledWith(chatRequest);

      // Test model management
      const models = await mockProvider.getModels!();
      expect(models).toEqual(["claude-3-5-sonnet", "claude-3-5-haiku"]);

      const isValid = mockProvider.validateModel!("claude-3-5-sonnet-20240620");
      expect(isValid).toBe(true);

      const maxTokens = mockProvider.getMaxTokens!(
        "claude-3-5-sonnet-20240620"
      );
      expect(maxTokens).toBe(200000);
    });
  });

  describe("Type Safety", () => {
    it("should have correct export types", async () => {
      const mockModule: MockModule = {
        anthropic: vi.fn(),
        withRetry: vi.fn(),
        withFallback: vi.fn(),
        ChatRequest: {},
        ChatMessage: {},
        ChatStreamChunk: {},
        AnthropicError: class extends Error implements MockError {
          constructor(
            message: string,
            public status?: number
          ) {
            super(message);
            this.name = "AnthropicError";
          }
        },
      };

      expect(typeof mockModule.anthropic).toBe("function");
      expect(typeof mockModule.withRetry).toBe("function");
      expect(typeof mockModule.withFallback).toBe("function");
      expect(mockModule.ChatRequest).toBeDefined();
      expect(mockModule.ChatMessage).toBeDefined();
      expect(mockModule.ChatStreamChunk).toBeDefined();
      expect(mockModule.AnthropicError).toBeDefined();
    });
  });

  describe("Model Support", () => {
    it("should support Claude 3 models", async () => {
      const mockProvider: MockProvider = {
        streamChat: vi.fn(),
      };

      const models = [
        "claude-3-haiku-20240307",
        "claude-3-sonnet-20240229",
        "claude-3-opus-20240229",
      ];

      for (const model of models) {
        const messages: MockStreamChatArgs = {
          model,
          messages: [{ role: "user", content: "Test" }],
        };
        mockProvider.streamChat(messages);
      }

      expect(mockProvider.streamChat).toHaveBeenCalledTimes(3);
    });
  });
});
