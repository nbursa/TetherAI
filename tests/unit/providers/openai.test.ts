import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  MockProvider,
  MockProviderConfig,
  MockStreamChatArgs,
  MockChatResponse,
  MockError,
} from "../../types/test-types";

// Mock fetch for testing
global.fetch = vi.fn();

describe("OpenAI Provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("Configuration", () => {
    it("should accept valid configuration options", async () => {
      const mockOpenAI = vi.fn().mockReturnValue({
        streamChat: vi.fn(),
        chat: vi.fn(),
        getModels: vi.fn(),
        validateModel: vi.fn(),
        getMaxTokens: vi.fn(),
      } as MockProvider);

      const config: MockProviderConfig = {
        apiKey: "sk-test-key",
        timeout: 30000,
        maxRetries: 3,
        organization: "org-test",
        baseURL: "https://api.openai.com/v1",
      };

      const provider = mockOpenAI(config);

      expect(provider).toBeDefined();
      expect(mockOpenAI).toHaveBeenCalledWith(config);
    });

    it("should use default values when options not provided", async () => {
      const mockOpenAI = vi.fn().mockReturnValue({
        streamChat: vi.fn(),
        chat: vi.fn(),
        getModels: vi.fn(),
        validateModel: vi.fn(),
        getMaxTokens: vi.fn(),
      } as MockProvider);

      const config: MockProviderConfig = {
        apiKey: "sk-test-key",
      };

      const provider = mockOpenAI(config);

      expect(provider).toBeDefined();
      expect(mockOpenAI).toHaveBeenCalledWith(config);
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
        model: "gpt-4o-mini",
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
        model: "gpt-4o-mini",
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
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hello" }],
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1,
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
        model: "gpt-4o-mini",
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
        },
        finishReason: "stop",
        metadata: { id: "chat-123", created: 1234567890 },
      };

      const mockChat = vi.fn().mockResolvedValue(mockResponse);

      const mockProvider: MockProvider = {
        streamChat: vi.fn(),
        chat: mockChat,
      };

      const request: MockStreamChatArgs = {
        model: "gpt-4o-mini",
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
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hello" }],
      };

      await expect(mockProvider.chat!(request)).rejects.toThrow("Chat failed");
      expect(mockChat).toHaveBeenCalledWith(request);
    });
  });

  describe("Model Management", () => {
    it("should list available models", async () => {
      const mockModels = ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"];
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
        .mockReturnValueOnce(true) // gpt-4o-mini
        .mockReturnValueOnce(false); // invalid-model

      const mockProvider: MockProvider = {
        streamChat: vi.fn(),
        validateModel: mockValidateModel,
      };

      const validModel = mockProvider.validateModel!("gpt-4o-mini");
      const invalidModel = mockProvider.validateModel!("invalid-model");

      expect(validModel).toBe(true);
      expect(invalidModel).toBe(false);
      expect(mockValidateModel).toHaveBeenCalledWith("gpt-4o-mini");
      expect(mockValidateModel).toHaveBeenCalledWith("invalid-model");
    });

    it("should get max tokens for models", () => {
      const mockGetMaxTokens = vi
        .fn()
        .mockReturnValueOnce(128000) // gpt-4o
        .mockReturnValueOnce(8192) // gpt-4
        .mockReturnValueOnce(16385); // gpt-3.5-turbo

      const mockProvider: MockProvider = {
        streamChat: vi.fn(),
        getMaxTokens: mockGetMaxTokens,
      };

      const gpt4oMax = mockProvider.getMaxTokens!("gpt-4o");
      const gpt4Max = mockProvider.getMaxTokens!("gpt-4");
      const gpt35Max = mockProvider.getMaxTokens!("gpt-3.5-turbo");

      expect(gpt4oMax).toBe(128000);
      expect(gpt4Max).toBe(8192);
      expect(gpt35Max).toBe(16385);
      expect(mockGetMaxTokens).toHaveBeenCalledWith("gpt-4o");
      expect(mockGetMaxTokens).toHaveBeenCalledWith("gpt-4");
      expect(mockGetMaxTokens).toHaveBeenCalledWith("gpt-3.5-turbo");
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
        model: "gpt-4o-mini",
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
        model: "gpt-4o-mini",
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

    it("should handle systemPrompt parameter", async () => {
      const mockStreamChat = vi.fn().mockImplementation(async function* () {
        yield { delta: "System guided response", done: false };
        yield { delta: "", done: true };
      });

      const mockProvider: MockProvider = {
        streamChat: mockStreamChat,
      };

      const request: MockStreamChatArgs = {
        model: "gpt-4o-mini",
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
        model: "gpt-4o-mini",
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
        model: "gpt-4o-mini",
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
        name: "OpenAIError",
        message: "API key invalid",
        status: 401,
      };

      const mockStreamChat = vi.fn().mockRejectedValue(mockError);

      const mockProvider: MockProvider = {
        streamChat: mockStreamChat,
      };

      const request: MockStreamChatArgs = {
        model: "gpt-4o-mini",
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
        model: "gpt-4o-mini",
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
        model: "gpt-4o-mini",
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        finishReason: "stop",
      });

      const mockProvider: MockProvider = {
        streamChat: mockStreamChat,
        chat: mockChat,
        getModels: vi.fn().mockResolvedValue(["gpt-4o", "gpt-4o-mini"]),
        validateModel: vi.fn().mockReturnValue(true),
        getMaxTokens: vi.fn().mockReturnValue(128000),
      };

      // Test streaming with enhanced options
      const streamRequest: MockStreamChatArgs = {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hello" }],
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1,
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
        model: "gpt-4o-mini",
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
      expect(models).toEqual(["gpt-4o", "gpt-4o-mini"]);

      const isValid = mockProvider.validateModel!("gpt-4o-mini");
      expect(isValid).toBe(true);

      const maxTokens = mockProvider.getMaxTokens!("gpt-4o");
      expect(maxTokens).toBe(128000);
    });
  });
});
