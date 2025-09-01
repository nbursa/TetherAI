// Export main provider function
export { localLLM } from "./local";

// Export error class
export { LocalLLMError } from "./types";

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
  LocalLLMOptions,
} from "./types";
