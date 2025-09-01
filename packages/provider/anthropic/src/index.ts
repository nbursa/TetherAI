// Export main provider function
export { anthropic } from "./anthropic";

// Export error class
export { AnthropicError } from "./types";

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
  AnthropicOptions,
} from "./types";
