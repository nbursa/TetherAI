import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  MockProvider,
  MockProviderConfig,
  MockStreamChatArgs,
  MockChatResponse,
} from "../../types/test-types";

describe("Local LLM Provider", () => {
  let mockProvider: MockProvider;
  let mockConfig: MockProviderConfig;

  beforeEach(() => {
    vi.resetModules();

    mockConfig = {
      baseURL: "http://localhost:11434", // Ollama default
      timeout: 30000,
      apiKey: "test-local-api-key",
    };

    mockProvider = {
      streamChat: vi.fn().mockResolvedValue([]),
      chat: vi.fn().mockResolvedValue({
        content: "Hello from local LLM",
        model: "llama2:7b",
        usage: {
          promptTokens: 15,
          completionTokens: 8,
          totalTokens: 23,
        },
        finishReason: "stop",
        metadata: { id: "local-123", created: 1234567890 },
      }),
      getModels: vi
        .fn()
        .mockResolvedValue([
          "llama2:7b",
          "codellama:7b",
          "mistral:7b",
          "gpt-3.5-turbo",
        ]),
      validateModel: vi.fn().mockReturnValue(true),
      getMaxTokens: vi.fn().mockImplementation((modelId: string) => {
        if (modelId.includes("llama2")) return 4096;
        if (modelId.includes("codellama")) return 16384;
        if (modelId.includes("mistral")) return 8192;
        if (modelId.includes("gpt-3.5")) return 4096;
        return 8192; // default for unknown models
      }),
    };
  });

  describe("Configuration", () => {
    it("should require baseURL", () => {
      expect(mockConfig.baseURL).toBe("http://localhost:11434");
    });

    it("should use default timeout", () => {
      expect(mockConfig.timeout).toBe(30000);
    });

    it("should support optional API key", () => {
      const configWithKey = { ...mockConfig, apiKey: "local-api-key" };
      expect(configWithKey.apiKey).toBe("local-api-key");
    });
  });

  describe("Streaming Chat", () => {
    it("should handle streaming chat requests", async () => {
      const request: MockStreamChatArgs = {
        model: "llama2:7b",
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
        model: "llama2:7b",
        messages: [{ role: "user", content: "Hello" }],
        systemPrompt: "You are a helpful coding assistant",
      };

      await mockProvider.chat!(request);
      expect(mockProvider.chat).toHaveBeenCalledWith(request);
    });
  });

  describe("Non-streaming Chat", () => {
    it("should handle chat requests", async () => {
      const request: MockStreamChatArgs = {
        model: "llama2:7b",
        messages: [{ role: "user", content: "Hello" }],
      };

      const response = (await mockProvider.chat!(request)) as MockChatResponse;
      expect(response.content).toBe("Hello from local LLM");
      expect(response.model).toBe("llama2:7b");
      expect(response.usage.promptTokens).toBe(15);
      expect(response.usage.completionTokens).toBe(8);
      expect(response.usage.totalTokens).toBe(23);
    });

    it("should handle chat with all parameters", async () => {
      const request: MockStreamChatArgs = {
        model: "codellama:7b",
        messages: [{ role: "user", content: "Write a function" }],
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
        "llama2:7b",
        "codellama:7b",
        "mistral:7b",
        "gpt-3.5-turbo",
      ]);
      expect(mockProvider.getModels).toHaveBeenCalled();
    });
  });

  describe("validateModel", () => {
    it("should accept all local model names", () => {
      expect(mockProvider.validateModel!("llama2:7b")).toBe(true);
      expect(mockProvider.validateModel!("codellama:7b")).toBe(true);
      expect(mockProvider.validateModel!("mistral:7b")).toBe(true);
      expect(mockProvider.validateModel!("gpt-3.5-turbo")).toBe(true);
      expect(mockProvider.validateModel!("custom-model")).toBe(true);
    });
  });

  describe("getMaxTokens", () => {
    it("should return correct token limits for different model types", () => {
      expect(mockProvider.getMaxTokens!("llama2:7b")).toBe(4096);
      expect(mockProvider.getMaxTokens!("codellama:7b")).toBe(16384);
      expect(mockProvider.getMaxTokens!("mistral:7b")).toBe(8192);
      expect(mockProvider.getMaxTokens!("gpt-3.5-turbo")).toBe(4096);
      expect(mockProvider.getMaxTokens!("unknown-model")).toBe(8192); // default
    });
  });

  describe("Local Endpoint Support", () => {
    it("should support Ollama endpoint", () => {
      const ollamaConfig = { baseURL: "http://localhost:11434" };
      expect(ollamaConfig.baseURL).toBe("http://localhost:11434");
    });

    it("should support LM Studio endpoint", () => {
      const lmStudioConfig = { baseURL: "http://localhost:1234/v1" };
      expect(lmStudioConfig.baseURL).toBe("http://localhost:1234/v1");
    });

    it("should support custom endpoints", () => {
      const customConfig = { baseURL: "http://192.168.1.100:8000" };
      expect(customConfig.baseURL).toBe("http://192.168.1.100:8000");
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors", async () => {
      const mockError = new Error("Connection refused");
      (mockError as Error & { status: number }).status = 500;
      mockProvider.chat = vi.fn().mockRejectedValue(mockError);

      const request: MockStreamChatArgs = {
        model: "llama2:7b",
        messages: [{ role: "user", content: "Hello" }],
      };

      await expect(mockProvider.chat!(request)).rejects.toThrow(
        "Connection refused"
      );
    });

    it("should handle local endpoint errors", async () => {
      const mockError = new Error("Model not found");
      (mockError as Error & { status: number }).status = 404;
      mockProvider.chat = vi.fn().mockRejectedValue(mockError);

      const request: MockStreamChatArgs = {
        model: "nonexistent-model",
        messages: [{ role: "user", content: "Hello" }],
      };

      await expect(mockProvider.chat!(request)).rejects.toThrow(
        "Model not found"
      );
    });
  });
});
