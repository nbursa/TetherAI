// Shared types for all TetherAI providers
// This file gets copied into each provider package during build

export type Role = "user" | "assistant" | "system" | "tool";

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  [key: string]: unknown; // for extensions (metadata, custom fields)
}

export interface ChatStreamChunk {
  delta: string;
  done?: boolean;
}

export interface Provider {
  streamChat(
    req: ChatRequest,
    signal?: AbortSignal
  ): AsyncIterable<ChatStreamChunk>;
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
