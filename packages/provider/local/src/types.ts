// Shared types for all TetherAI providers
// This file gets copied into each provider package during build

export type Role = "user" | "assistant" | "system" | "tool";

export interface ModelInfo {
  id: string;
  name: string;
  maxTokens: number;
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
  supportsMultiModal: boolean;
  pricing: {
    input: number; // per 1K tokens
    output: number; // per 1K tokens
  };
}

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

// Common error interface
export interface AIProviderError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly provider: string;
}

// OpenAI-specific types
export interface OpenAIOptions {
  apiKey: string;
  baseURL?: string; // defaults to https://api.openai.com/v1
  organization?: string;
  maxRetries?: number;
  timeout?: number;
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

export class OpenAIError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenAIError";
    this.status = status;
  }
}

// Anthropic-specific types
export interface AnthropicOptions {
  apiKey: string;
  baseURL?: string; // default: https://api.anthropic.com/v1
  apiVersion?: string; // default: 2023-06-01
  maxRetries?: number;
  timeout?: number;
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

export class AnthropicError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AnthropicError";
    this.status = status;
  }
}

// Mistral-specific types
export interface MistralOptions {
  apiKey: string;
  baseURL?: string; // default: https://api.mistral.ai/v1
  timeout?: number;
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

export class MistralError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "MistralError";
    this.status = status;
  }
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

// Local LLM-specific types
export interface LocalLLMOptions {
  baseURL: string; // Required: local endpoint URL (e.g., http://localhost:11434 for Ollama)
  timeout?: number;
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  // Optional: API key if local endpoint requires authentication
  apiKey?: string;
}

export class LocalLLMError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "LocalLLMError";
    this.status = status;
  }
}
