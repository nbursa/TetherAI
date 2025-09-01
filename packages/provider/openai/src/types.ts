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
  seed?: number;
  logprobs?: boolean;
  logitBias?: Record<string, number>;
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

// OpenAI-specific types
export interface OpenAIOptions {
  apiKey: string;
  baseURL?: string;
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
