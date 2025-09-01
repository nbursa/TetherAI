export type Role = "user" | "assistant" | "system" | "tool";

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  systemPrompt?: string;
  responseFormat?: "text" | "json_object";
  user?: string;
  metadata?: Record<string, unknown>;
  logitBias?: Record<string, number>;
  topK?: number;
  [key: string]: unknown;
}

export interface ChatStreamChunk {
  delta: string;
  done?: boolean;
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
  getModels(): Promise<string[]>;
  validateModel(modelId: string): boolean;
  getMaxTokens(modelId: string): number;
}

// Anthropic-specific types
export interface AnthropicOptions {
  apiKey: string;
  baseURL?: string;
  apiVersion?: string;
  maxRetries?: number;
  timeout?: number;
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  beta?: string; // Anthropic beta features
}

export class AnthropicError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AnthropicError";
    this.status = status;
  }
}
