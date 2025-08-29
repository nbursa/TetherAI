import { describe, it, expect } from "vitest";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "../..");

describe("Standalone Provider Tests", () => {
  describe("OpenAI Provider", () => {
    it("should import successfully", async () => {
      try {
        const openaiModule = await import(
          resolve(projectRoot, "packages/provider/openai/dist/src/index.js")
        );

        expect(openaiModule).toBeDefined();
        expect(typeof openaiModule.openAI).toBe("function");
        expect(typeof openaiModule.withRetry).toBe("function");
        expect(typeof openaiModule.withFallback).toBe("function");

        console.log("✅ OpenAI provider imported successfully");
        console.log("Available exports:", Object.keys(openaiModule));
      } catch (error) {
        console.error("❌ OpenAI provider import failed:", error);
        throw error;
      }
    });

    it("should have core functionality", async () => {
      try {
        const openaiModule = await import(
          resolve(projectRoot, "packages/provider/openai/dist/src/index.js")
        );

        // Check for core functions and error classes
        expect("openAI" in openaiModule).toBe(true);
        expect("OpenAIError" in openaiModule).toBe(true);
        expect("withRetry" in openaiModule).toBe(true);
        expect("withFallback" in openaiModule).toBe(true);

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

  describe("Provider Independence", () => {
    it("should have independent types and functions", async () => {
      const openaiModule = await import(
        resolve(projectRoot, "packages/provider/openai/dist/src/index.js")
      );
      const anthropicModule = await import(
        resolve(projectRoot, "packages/provider/anthropic/dist/src/index.js")
      );

      // Check that they have their own functions
      expect("openAI" in openaiModule).toBe(true);
      expect("anthropic" in anthropicModule).toBe(true);

      // Check that they have shared middleware
      expect("withRetry" in openaiModule).toBe(true);
      expect("withFallback" in openaiModule).toBe(true);
      expect("withRetry" in anthropicModule).toBe(true);
      expect("withFallback" in anthropicModule).toBe(true);

      console.log("✅ Providers are independent!");
    });

    it("should have consistent core interfaces", async () => {
      const openaiModule = await import(
        resolve(projectRoot, "packages/provider/openai/dist/src/index.js")
      );
      const anthropicModule = await import(
        resolve(projectRoot, "packages/provider/anthropic/dist/src/index.js")
      );

      // Both should have the same core functionality
      const coreFunctions = ["withRetry", "withFallback"];
      const openaiCore = ["openAI", "OpenAIError"];
      const anthropicCore = ["anthropic", "AnthropicError"];

      coreFunctions.forEach((func) => {
        expect(func in openaiModule).toBe(true);
        expect(func in anthropicModule).toBe(true);
      });

      openaiCore.forEach((func) => {
        expect(func in openaiModule).toBe(true);
      });

      anthropicCore.forEach((func) => {
        expect(func in anthropicModule).toBe(true);
      });

      console.log("✅ Both providers have consistent core interfaces!");
    });
  });
});
