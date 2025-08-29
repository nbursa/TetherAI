import { describe, it, expect } from "vitest";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = resolve(__dirname, "../..");

describe("Standalone Provider Packages", () => {
  describe("OpenAI Provider", () => {
    it("should import successfully", async () => {
      try {
        const openAIModule = await import(
          resolve(projectRoot, "packages/provider/openai/dist/src/index.js")
        );

        expect(openAIModule).toBeDefined();
        expect(typeof openAIModule.openAI).toBe("function");
        expect(typeof openAIModule.withRetry).toBe("function");
        expect(typeof openAIModule.withFallback).toBe("function");

        console.log("✅ OpenAI provider imported successfully");
        console.log("Available exports:", Object.keys(openAIModule));
      } catch (error) {
        console.error("❌ OpenAI provider import failed:", error);
        throw error;
      }
    });

    it("should have core functionality", async () => {
      try {
        const openAIModule = await import(
          resolve(projectRoot, "packages/provider/openai/dist/src/index.js")
        );

        // Check for core functions and error classes
        expect("openAI" in openAIModule).toBe(true);
        expect("OpenAIError" in openAIModule).toBe(true);
        expect("withRetry" in openAIModule).toBe(true);
        expect("withFallback" in openAIModule).toBe(true);

        console.log("✅ OpenAI provider has core functionality");
      } catch (error) {
        console.error("❌ OpenAI core functionality check failed:", error);
        throw error;
      }
    });
  });

  describe("Anthropic Provider", () => {
    it("should import successfully", async () => {
      try {
        const anthropicModule = await import(
          resolve(projectRoot, "packages/provider/anthropic/dist/src/index.js")
        );

        expect(anthropicModule).toBeDefined();
        expect(typeof anthropicModule.anthropic).toBe("function");
        expect(typeof anthropicModule.withRetry).toBe("function");
        expect(typeof anthropicModule.withFallback).toBe("function");

        console.log("✅ Anthropic provider imported successfully");
        console.log("Available exports:", Object.keys(anthropicModule));
      } catch (error) {
        console.error("❌ Anthropic provider import failed:", error);
        throw error;
      }
    });

    it("should have core functionality", async () => {
      try {
        const anthropicModule = await import(
          resolve(projectRoot, "packages/provider/anthropic/dist/src/index.js")
        );

        // Check for core functions and error classes
        expect("anthropic" in anthropicModule).toBe(true);
        expect("AnthropicError" in anthropicModule).toBe(true);
        expect("withRetry" in anthropicModule).toBe(true);
        expect("withFallback" in anthropicModule).toBe(true);

        console.log("✅ Anthropic provider has core functionality");
      } catch (error) {
        console.error("❌ Anthropic core functionality check failed:", error);
        throw error;
      }
    });
  });

  describe("Mistral Provider", () => {
    it("should import successfully", async () => {
      try {
        const mistralModule = await import(
          resolve(projectRoot, "packages/provider/mistral/dist/src/index.js")
        );

        expect(mistralModule).toBeDefined();
        expect(typeof mistralModule.mistral).toBe("function");
        expect(typeof mistralModule.withRetry).toBe("function");
        expect(typeof mistralModule.withFallback).toBe("function");

        console.log("✅ Mistral provider imported successfully");
        console.log("Available exports:", Object.keys(mistralModule));
      } catch (error) {
        console.error("❌ Mistral provider import failed:", error);
        throw error;
      }
    });

    it("should have core functionality", async () => {
      try {
        const mistralModule = await import(
          resolve(projectRoot, "packages/provider/mistral/dist/src/index.js")
        );

        // Check for core functions and error classes
        expect("mistral" in mistralModule).toBe(true);
        expect("MistralError" in mistralModule).toBe(true);
        expect("withRetry" in mistralModule).toBe(true);
        expect("withFallback" in mistralModule).toBe(true);

        console.log("✅ Mistral provider has core functionality");
      } catch (error) {
        console.error("❌ Mistral core functionality check failed:", error);
        throw error;
      }
    });
  });

  describe("Grok Provider", () => {
    it("should import successfully", async () => {
      try {
        const grokModule = await import(
          resolve(projectRoot, "packages/provider/grok/dist/src/index.js")
        );

        expect(grokModule).toBeDefined();
        expect(typeof grokModule.grok).toBe("function");
        expect(typeof grokModule.withRetry).toBe("function");
        expect(typeof grokModule.withFallback).toBe("function");

        console.log("✅ Grok provider imported successfully");
        console.log("Available exports:", Object.keys(grokModule));
      } catch (error) {
        console.error("❌ Grok provider import failed:", error);
        throw error;
      }
    });

    it("should have core functionality", async () => {
      try {
        const grokModule = await import(
          resolve(projectRoot, "packages/provider/grok/dist/src/index.js")
        );

        // Check for core functions and error classes
        expect("grok" in grokModule).toBe(true);
        expect("GrokError" in grokModule).toBe(true);
        expect("withRetry" in grokModule).toBe(true);
        expect("withFallback" in grokModule).toBe(true);

        console.log("✅ Grok provider has core functionality");
      } catch (error) {
        console.error("❌ Grok core functionality check failed:", error);
        throw error;
      }
    });
  });

  describe("Local LLM Provider", () => {
    it("should import successfully", async () => {
      try {
        const localLLMModule = await import(
          resolve(projectRoot, "packages/provider/local/dist/src/index.js")
        );

        expect(localLLMModule).toBeDefined();
        expect(typeof localLLMModule.localLLM).toBe("function");
        expect(typeof localLLMModule.withRetry).toBe("function");
        expect(typeof localLLMModule.withFallback).toBe("function");

        console.log("✅ Local LLM provider imported successfully");
        console.log("Available exports:", Object.keys(localLLMModule));
      } catch (error) {
        console.error("❌ Local LLM provider import failed:", error);
        throw error;
      }
    });

    it("should have core functionality", async () => {
      try {
        const localLLMModule = await import(
          resolve(projectRoot, "packages/provider/local/dist/src/index.js")
        );

        // Check for core functions and error classes
        expect("localLLM" in localLLMModule).toBe(true);
        expect("LocalLLMError" in localLLMModule).toBe(true);
        expect("withRetry" in localLLMModule).toBe(true);
        expect("withFallback" in localLLMModule).toBe(true);

        console.log("✅ Local LLM provider has core functionality");
      } catch (error) {
        console.error("❌ Local LLM core functionality check failed:", error);
        throw error;
      }
    });
  });
});
