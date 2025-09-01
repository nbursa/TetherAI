// Export main provider function
export { openAI } from "./openai";

// Export error class
export { OpenAIError } from "./types";

// Export middleware
export { withRetry, withFallback } from "./middleware";

// Export SSE utility
export { sseToIterable } from "./sse";

// Export all types
export type {
  ChatRequest,
  ChatMessage,
  ChatStreamChunk,
  ChatResponse,
  Provider,
  OpenAIOptions,
} from "./types";
