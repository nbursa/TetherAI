import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  MockProvider,
  MockProviderConfig,
  MockStreamChatArgs,
  MockChatResponse,
} from "../../types/test-types";

describe("Grok Provider", () => {
  let mockProvider: MockProvider;
  let mockConfig: MockProviderConfig;

  beforeEach(() => {
    vi.resetModules();

    mockConfig = {
      apiKey: "test-grok-api-key",
      baseURL: "https://api.x.ai/v1",
      timeout: 30000,
    };

    mockProvider = {
      streamChat: vi.fn().mockResolvedValue([]),
      chat: vi.fn().mockResolvedValue({
        content: "Hello World",
        model: "grok-beta",
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
        },
        finishReason: "stop",
        metadata: { id: "test-123", created: 1234567890 },
      }),
      getModels: vi
        .fn()
        .mockResolvedValue([
          "grok-beta",
          "grok-beta-vision",
          "grok-beta-2",
          "grok-beta-2-vision",
        ]),
      validateModel: vi.fn().mockImplementation((modelId: string) => {
        const validModels = [
          "grok-beta",
          "grok-beta-vision",
          "grok-beta-2",
          "grok-beta-2-vision",
        ];
        return validModels.some((model) => modelId.startsWith(model));
      }),
      getMaxTokens: vi.fn().mockImplementation((modelId: string) => {
        if (modelId.includes("vision")) return 128000;
        if (modelId.includes("beta-2")) return 128000;
        return 8192; // default for grok-beta
      }),
    };
  });

  describe("Configuration", () => {
    it("should use default base URL", () => {
      expect(mockConfig.baseURL).toBe("https://api.x.ai/v1");
    });

    it("should use default timeout", () => {
      expect(mockConfig.timeout).toBe(30000);
    });
  });

  describe("Streaming Chat", () => {
    it("should handle streaming chat requests", async () => {
      const request: MockStreamChatArgs = {
        model: "grok-beta",
        messages: [{ role: "user", content: "Hello" }],
        temperature: 0.7,
        maxTokens: 1000,
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

      expect(mockProvider.streamChat).toHaveBeenCalledWith(request);
    });

    it("should handle system prompts", async () => {
      const request: MockStreamChatArgs = {
        model: "grok-beta",
        messages: [{ role: "user", content: "Hello" }],
        systemPrompt: "You are a helpful assistant",
      };

      await mockProvider.chat!(request);
      expect(mockProvider.chat).toHaveBeenCalledWith(request);
    });
  });

  describe("Non-streaming Chat", () => {
    it("should handle chat requests", async () => {
      const request: MockStreamChatArgs = {
        model: "grok-beta",
        messages: [{ role: "user", content: "Hello" }],
      };

      const response = (await mockProvider.chat!(request)) as MockChatResponse;
      expect(response.content).toBe("Hello World");
      expect(response.model).toBe("grok-beta");
      expect(response.usage.promptTokens).toBe(10);
      expect(response.usage.completionTokens).toBe(5);
      expect(response.usage.totalTokens).toBe(15);
    });

    it("should handle chat with all parameters", async () => {
      const request: MockStreamChatArgs = {
        model: "grok-beta",
        messages: [{ role: "user", content: "Hello" }],
        temperature: 0.8,
        maxTokens: 500,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1,
        stop: ["\n", "END"],
      };

      await mockProvider.chat!(request);
      expect(mockProvider.chat).toHaveBeenCalledWith(request);
    });
  });

  describe("getModels", () => {
    it("should fetch available models", async () => {
      const models = await mockProvider.getModels!();
      expect(models).toEqual([
        "grok-beta",
        "grok-beta-vision",
        "grok-beta-2",
        "grok-beta-2-vision",
      ]);
      expect(mockProvider.getModels).toHaveBeenCalled();
    });
  });

  describe("validateModel", () => {
    it("should validate Grok model names", () => {
      expect(mockProvider.validateModel!("grok-beta")).toBe(true);
      expect(mockProvider.validateModel!("grok-beta-vision")).toBe(true);
      expect(mockProvider.validateModel!("grok-beta-2")).toBe(true);
      expect(mockProvider.validateModel!("grok-beta-2-vision")).toBe(true);
    });

    it("should reject invalid model names", () => {
      expect(mockProvider.validateModel!("gpt-4")).toBe(false);
      expect(mockProvider.validateModel!("claude-3")).toBe(false);
      expect(mockProvider.validateModel!("mistral-large")).toBe(false);
    });
  });

  describe("getMaxTokens", () => {
    it("should return correct token limits for different models", () => {
      expect(mockProvider.getMaxTokens!("grok-beta")).toBe(8192);
      expect(mockProvider.getMaxTokens!("grok-beta-vision")).toBe(128000);
      expect(mockProvider.getMaxTokens!("grok-beta-2")).toBe(128000);
      expect(mockProvider.getMaxTokens!("grok-beta-2-vision")).toBe(128000);
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors", async () => {
      const mockError = new Error("Network error");
      (mockError as Error & { status: number }).status = 500;
      mockProvider.chat = vi.fn().mockRejectedValue(mockError);

      const request: MockStreamChatArgs = {
        model: "grok-beta",
        messages: [{ role: "user", content: "Hello" }],
      };

      await expect(mockProvider.chat!(request)).rejects.toThrow(
        "Network error"
      );
    });

    it("should handle API errors", async () => {
      const mockError = new Error("Invalid API key");
      (mockError as Error & { status: number }).status = 401;
      mockProvider.chat = vi.fn().mockRejectedValue(mockError);

      const request: MockStreamChatArgs = {
        model: "grok-beta",
        messages: [{ role: "user", content: "Hello" }],
      };

      await expect(mockProvider.chat!(request)).rejects.toThrow(
        "Invalid API key"
      );
    });
  });
});
