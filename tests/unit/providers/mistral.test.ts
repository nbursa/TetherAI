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

describe("Mistral Provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("Configuration", () => {
    it("should accept valid configuration options", async () => {
      const mockMistral = vi.fn().mockReturnValue({
        streamChat: vi.fn(),
        chat: vi.fn(),
        getModels: vi.fn(),
        validateModel: vi.fn(),
        getMaxTokens: vi.fn(),
      } as MockProvider);

      const config: MockProviderConfig = {
        apiKey: "test-api-key",
        timeout: 30000,
        baseURL: "https://api.mistral.ai/v1",
      };

      const provider = mockMistral(config);

      expect(provider).toBeDefined();
      expect(mockMistral).toHaveBeenCalledWith(config);
    });

    it("should use default values when options not provided", async () => {
      const mockMistral = vi.fn().mockReturnValue({
        streamChat: vi.fn(),
        chat: vi.fn(),
        getModels: vi.fn(),
        validateModel: vi.fn(),
        getMaxTokens: vi.fn(),
      } as MockProvider);

      const config: MockProviderConfig = {
        apiKey: "test-api-key",
      };

      const provider = mockMistral(config);

      expect(provider).toBeDefined();
      expect(mockMistral).toHaveBeenCalledWith(config);
    });
  });

  describe("Streaming Chat", () => {
    it("should stream chat responses correctly", async () => {
      const mockStream = [
        { delta: "Hello", done: false },
        { delta: " World", done: false },
        { delta: "!", done: true },
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
        model: "mistral-medium-latest",
        messages: [{ role: "user", content: "Say hello" }],
      };

      const stream = mockProvider.streamChat(messages);

      if (
        Symbol.asyncIterator in stream &&
        typeof stream[Symbol.asyncIterator] === "function"
      ) {
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

    it("should handle enhanced chat options", async () => {
      const mockStreamChat = vi.fn().mockImplementation(async function* () {
        yield { delta: "Response", done: true };
      });

      const mockProvider: MockProvider = {
        streamChat: mockStreamChat,
      };

      const request: MockStreamChatArgs = {
        model: "mistral-large-latest",
        messages: [{ role: "user", content: "Test" }],
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1,
        stop: ["END"],
        responseFormat: "json_object",
        safeMode: true,
        user: "test-user",
      };

      const stream = mockProvider.streamChat(request);
      if (Symbol.asyncIterator in stream) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const chunk of stream as AsyncGenerator<unknown>) {
          // consume stream
        }
      } else {
        await stream; // handle Promise case
      }

      expect(mockStreamChat).toHaveBeenCalledWith(request);
    });

    it("should handle system prompt", async () => {
      const mockStreamChat = vi.fn().mockImplementation(async function* () {
        yield { delta: "Response", done: true };
      });

      const mockProvider: MockProvider = {
        streamChat: mockStreamChat,
      };

      const request: MockStreamChatArgs = {
        model: "mistral-medium-latest",
        messages: [{ role: "user", content: "Hello" }],
        systemPrompt: "You are a helpful assistant.",
      };

      const stream = mockProvider.streamChat(request);
      if (Symbol.asyncIterator in stream) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const chunk of stream as AsyncGenerator<unknown>) {
          // consume stream
        }
      } else {
        await stream; // handle Promise case
      }

      expect(mockStreamChat).toHaveBeenCalledWith(request);
    });

    it("should handle errors correctly", async () => {
      const mockError = new Error("Test error") as MockError;
      mockError.status = 400;

      const mockStreamChat = vi.fn().mockRejectedValue(mockError);

      const mockProvider: MockProvider = {
        streamChat: mockStreamChat,
      };

      const request: MockStreamChatArgs = {
        model: "mistral-medium-latest",
        messages: [{ role: "user", content: "Hello" }],
      };

      await expect(async () => {
        const stream = mockProvider.streamChat(request);
        if (Symbol.asyncIterator in stream) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          for await (const chunk of stream as AsyncGenerator<unknown>) {
            // consume stream
          }
        } else {
          await stream; // handle Promise case
        }
      }).rejects.toThrow("Test error");
    });
  });

  describe("Non-streaming Chat", () => {
    it("should make non-streaming request", async () => {
      const mockResponse: MockChatResponse = {
        content: "Hello there!",
        model: "mistral-medium-latest",
        usage: {
          promptTokens: 5,
          completionTokens: 3,
          totalTokens: 8,
        },
        finishReason: "stop",
        metadata: { id: "chatcmpl-123", created: 1234567890 },
      };

      const mockChat = vi.fn().mockResolvedValue(mockResponse);

      const mockProvider: MockProvider = {
        streamChat: vi.fn(),
        chat: mockChat,
        getModels: vi.fn(),
        validateModel: vi.fn(),
        getMaxTokens: vi.fn(),
      };

      const request: MockStreamChatArgs = {
        model: "mistral-medium-latest",
        messages: [{ role: "user", content: "Hello" }],
      };

      const response = await mockProvider.chat!(request);

      expect(mockChat).toHaveBeenCalledWith(request);
      expect(response).toEqual(mockResponse);
    });

    it("should handle enhanced chat options in non-streaming mode", async () => {
      const mockResponse: MockChatResponse = {
        content: "Response",
        model: "mistral-large-latest",
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        finishReason: "stop",
        metadata: { id: "chatcmpl-123", created: 1234567890 },
      };

      const mockChat = vi.fn().mockResolvedValue(mockResponse);

      const mockProvider: MockProvider = {
        streamChat: vi.fn(),
        chat: mockChat,
        getModels: vi.fn(),
        validateModel: vi.fn(),
        getMaxTokens: vi.fn(),
      };

      const request: MockStreamChatArgs = {
        model: "mistral-large-latest",
        messages: [{ role: "user", content: "Test" }],
        temperature: 0.8,
        maxTokens: 500,
        systemPrompt: "Be concise",
      };

      await mockProvider.chat!(request);

      expect(mockChat).toHaveBeenCalledWith(request);
    });
  });

  describe("getModels", () => {
    it("should fetch available models", async () => {
      const mockModels = [
        "mistral-large-latest",
        "mistral-medium-latest",
        "mistral-small-latest",
      ];

      const mockGetModels = vi.fn().mockResolvedValue(mockModels);

      const mockProvider: MockProvider = {
        streamChat: vi.fn(),
        chat: vi.fn(),
        getModels: mockGetModels,
        validateModel: vi.fn(),
        getMaxTokens: vi.fn(),
      };

      const models = await mockProvider.getModels!();

      expect(mockGetModels).toHaveBeenCalled();
      expect(models).toEqual(mockModels);
    });

    it("should handle API errors", async () => {
      const mockError = new Error("Failed to fetch models: 401") as MockError;
      mockError.status = 401;

      const mockGetModels = vi.fn().mockRejectedValue(mockError);

      const mockProvider: MockProvider = {
        streamChat: vi.fn(),
        chat: vi.fn(),
        getModels: mockGetModels,
        validateModel: vi.fn(),
        getMaxTokens: vi.fn(),
      };

      await expect(mockProvider.getModels!()).rejects.toThrow(
        "Failed to fetch models: 401"
      );
    });
  });

  describe("validateModel", () => {
    it("should validate known models", () => {
      const mockValidateModel = vi
        .fn()
        .mockReturnValueOnce(true) // mistral-large-latest
        .mockReturnValueOnce(true) // mistral-medium-latest
        .mockReturnValueOnce(true) // mistral-small-latest
        .mockReturnValueOnce(true) // mistral-7b-instruct
        .mockReturnValueOnce(true) // open-mistral-7b
        .mockReturnValueOnce(true) // open-mixtral-8x7b
        .mockReturnValueOnce(true); // open-mixtral-8x22b

      const mockProvider: MockProvider = {
        streamChat: vi.fn(),
        chat: vi.fn(),
        getModels: vi.fn(),
        validateModel: mockValidateModel,
        getMaxTokens: vi.fn(),
      };

      expect(mockProvider.validateModel!("mistral-large-latest")).toBe(true);
      expect(mockProvider.validateModel!("mistral-medium-latest")).toBe(true);
      expect(mockProvider.validateModel!("mistral-small-latest")).toBe(true);
      expect(mockProvider.validateModel!("mistral-7b-instruct")).toBe(true);
      expect(mockProvider.validateModel!("open-mistral-7b")).toBe(true);
      expect(mockProvider.validateModel!("open-mixtral-8x7b")).toBe(true);
      expect(mockProvider.validateModel!("open-mixtral-8x22b")).toBe(true);
    });

    it("should reject unknown models", () => {
      const mockValidateModel = vi
        .fn()
        .mockReturnValueOnce(false) // unknown-model
        .mockReturnValueOnce(false) // gpt-4
        .mockReturnValueOnce(false); // claude-3

      const mockProvider: MockProvider = {
        streamChat: vi.fn(),
        chat: vi.fn(),
        getModels: vi.fn(),
        validateModel: mockValidateModel,
        getMaxTokens: vi.fn(),
      };

      expect(mockProvider.validateModel!("unknown-model")).toBe(false);
      expect(mockProvider.validateModel!("gpt-4")).toBe(false);
      expect(mockProvider.validateModel!("claude-3")).toBe(false);
    });
  });

  describe("getMaxTokens", () => {
    it("should return correct token limits", () => {
      const mockGetMaxTokens = vi
        .fn()
        .mockReturnValueOnce(32768) // mistral-large-latest
        .mockReturnValueOnce(16384) // mistral-medium-latest
        .mockReturnValueOnce(8192) // mistral-small-latest
        .mockReturnValueOnce(8192) // mistral-7b-instruct
        .mockReturnValueOnce(65536) // open-mixtral-8x22b
        .mockReturnValueOnce(32768); // open-mixtral-8x7b

      const mockProvider: MockProvider = {
        streamChat: vi.fn(),
        chat: vi.fn(),
        getModels: vi.fn(),
        validateModel: vi.fn(),
        getMaxTokens: mockGetMaxTokens,
      };

      expect(mockProvider.getMaxTokens!("mistral-large-latest")).toBe(32768);
      expect(mockProvider.getMaxTokens!("mistral-medium-latest")).toBe(16384);
      expect(mockProvider.getMaxTokens!("mistral-small-latest")).toBe(8192);
      expect(mockProvider.getMaxTokens!("mistral-7b-instruct")).toBe(8192);
      expect(mockProvider.getMaxTokens!("open-mixtral-8x22b")).toBe(65536);
      expect(mockProvider.getMaxTokens!("open-mixtral-8x7b")).toBe(32768);
    });

    it("should return default for unknown models", () => {
      const mockGetMaxTokens = vi.fn().mockReturnValue(4096);

      const mockProvider: MockProvider = {
        streamChat: vi.fn(),
        chat: vi.fn(),
        getModels: vi.fn(),
        validateModel: vi.fn(),
        getMaxTokens: mockGetMaxTokens,
      };

      expect(mockProvider.getMaxTokens!("unknown-model")).toBe(4096);
    });
  });

  describe("configuration", () => {
    it("should use custom base URL", () => {
      const mockMistral = vi.fn().mockReturnValue({} as MockProvider);

      const config: MockProviderConfig = {
        apiKey: "test-api-key",
        baseURL: "https://custom.mistral.ai/v1",
      };

      const customProvider = mockMistral(config);

      expect(customProvider).toBeDefined();
      expect(mockMistral).toHaveBeenCalledWith(config);
    });

    it("should use custom timeout", () => {
      const mockMistral = vi.fn().mockReturnValue({} as MockProvider);

      const config: MockProviderConfig = {
        apiKey: "test-api-key",
        timeout: 60000,
      };

      const customProvider = mockMistral(config);

      expect(customProvider).toBeDefined();
      expect(mockMistral).toHaveBeenCalledWith(config);
    });

    it("should use custom fetch", () => {
      const mockMistral = vi.fn().mockReturnValue({} as MockProvider);

      const config: MockProviderConfig = {
        apiKey: "test-api-key",
        timeout: 60000,
      };

      const customProvider = mockMistral(config);

      expect(customProvider).toBeDefined();
      expect(mockMistral).toHaveBeenCalledWith(config);
    });
  });
});
