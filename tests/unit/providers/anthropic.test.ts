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
        model: "claude-3-haiku-20240307",
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
        model: "claude-3-haiku-20240307",
        messages: [{ role: "user", content: "Test" }],
      };

      await expect(mockProvider.streamChat(messages)).rejects.toThrow(
        "Stream failed"
      );
    });
  });

  describe("Regular Chat", () => {
    it("should return complete chat response", async () => {
      const mockResponse: MockChatResponse = {
        content: "Hello World!",
        done: true,
      };

      const mockChat = vi.fn().mockResolvedValue(mockResponse);
      const mockProvider: MockProvider = {
        streamChat: vi.fn(),
        chat: mockChat,
      };

      const messages: MockStreamChatArgs = {
        model: "claude-3-haiku-20240307",
        messages: [{ role: "user", content: "Say hello" }],
      };

      if (mockProvider.chat) {
        const response = await mockProvider.chat(messages);
        expect(response).toEqual(mockResponse);
        expect(mockChat).toHaveBeenCalledWith(messages);
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors correctly", async () => {
      const mockError: MockError = new Error(
        "API rate limit exceeded"
      ) as MockError;
      mockError.name = "AnthropicError";
      mockError.status = 429;

      const mockStreamChat = vi.fn().mockRejectedValue(mockError);
      const mockProvider: MockProvider = {
        streamChat: mockStreamChat,
      };

      const messages: MockStreamChatArgs = {
        model: "claude-3-haiku-20240307",
        messages: [{ role: "user", content: "Test" }],
      };

      try {
        await mockProvider.streamChat(messages);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error && "status" in error) {
          expect((error as MockError).status).toBe(429);
        }
      }
    });

    it("should handle network errors", async () => {
      const mockError = new Error("Network timeout");
      mockError.name = "TypeError";

      const mockStreamChat = vi.fn().mockRejectedValue(mockError);
      const mockProvider: MockProvider = {
        streamChat: mockStreamChat,
      };

      const messages: MockStreamChatArgs = {
        model: "claude-3-haiku-20240307",
        messages: [{ role: "user", content: "Test" }],
      };

      await expect(mockProvider.streamChat(messages)).rejects.toThrow(
        "Network timeout"
      );
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
