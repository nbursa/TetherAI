// Grok-specific types for TetherAI provider
// This file contains only Grok-specific types and interfaces

export type Role = "user" | "assistant" | "system" | "tool";

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];

  // Core chat parameters
  temperature?: number; // 0-2, default: 1
  maxTokens?: number; // 1-4096, default: unlimited
  topP?: number; // 0-1, default: 1
  frequencyPenalty?: number; // -2.0 to 2.0, default: 0
  presencePenalty?: number; // -2.0 to 2.0, default: 0

  // Stop sequences
  stop?: string | string[]; // Stop generation at these sequences

  // System behavior
  systemPrompt?: string; // Alternative to system message

  // Response format
  responseFormat?: "text" | "json_object";

  // Safety and moderation
  safeMode?: boolean; // Enable content filtering

  // Metadata
  user?: string; // User identifier for moderation
  metadata?: Record<string, unknown>; // Custom metadata

  // Extensions
  [key: string]: unknown; // for additional provider-specific fields
}

export interface ChatStreamChunk {
  delta: string;
  done?: boolean;

  // Enhanced streaming metadata
  finishReason?: "stop" | "length" | "content_filter" | "tool_calls";
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: "stop" | "length" | "content_filter" | "tool_calls";
  metadata?: Record<string, unknown>;
}

export interface Provider {
  streamChat(
    req: ChatRequest,
    signal?: AbortSignal
  ): AsyncIterable<ChatStreamChunk>;

  chat(req: ChatRequest, signal?: AbortSignal): Promise<ChatResponse>;

  // Enhanced provider capabilities
  getModels(): Promise<string[]>;
  validateModel(modelId: string): boolean;
  getMaxTokens(modelId: string): number;
}

// Grok-specific types
export interface GrokOptions {
  apiKey: string;
  baseURL?: string; // default: https://api.x.ai/v1
  timeout?: number;
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

export class GrokError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GrokError";
    this.status = status;
  }
}
