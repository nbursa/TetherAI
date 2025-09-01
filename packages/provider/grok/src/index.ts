// Export main provider function
export { grok } from "./grok";

// Export error class
export { GrokError } from "./types";

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
  GrokOptions,
} from "./types";
