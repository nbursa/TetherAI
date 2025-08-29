// Test-specific type definitions to avoid 'any' types

export interface MockProvider {
  streamChat: (
    ...args: unknown[]
  ) => Promise<unknown> | AsyncGenerator<unknown>;
  chat?: (...args: unknown[]) => Promise<unknown>;
  getModels?: () => Promise<string[]>;
  validateModel?: (modelId: string) => boolean;
  getMaxTokens?: (modelId: string) => number;
}

export interface MockStreamChatArgs {
  model: string;
  messages: Array<{ role: string; content: string }>;
  // Enhanced chat options
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  systemPrompt?: string;
  responseFormat?: "text" | "json_object";
  safeMode?: boolean;
  user?: string;
  metadata?: Record<string, unknown>;
}

export interface MockStreamChunk {
  data?: string;
  done?: boolean;
  error?: string;
}

export interface MockChatResponse {
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

export interface MockError extends Error {
  status?: number;
  name: string;
}

export interface MockRetryOptions {
  retries: number;
  baseMs?: number;
  factor?: number;
  jitter?: boolean;
}

export interface MockFallbackOptions {
  maxFallbacks?: number;
  onFallback?: (error: MockError, providerIndex: number) => void;
}

export interface MockSSEParseResult {
  data?: unknown;
  done?: boolean;
  event?: string;
  id?: string;
  retry?: number;
  error?: string;
}

export interface MockSSEChunk {
  data?: string;
  done: boolean;
}

export interface MockProviderConfig {
  apiKey: string;
  timeout?: number;
  maxRetries?: number;
  organization?: string;
  baseURL?: string;
  apiVersion?: string;
}

export interface MockMiddlewareConfig {
  retry: MockRetryOptions;
  fallback: MockFallbackOptions;
}

export interface MockGlobalConfig {
  providers: {
    openai: MockProviderConfig;
    anthropic: MockProviderConfig;
    mistral: MockProviderConfig;
  };
  middleware: MockMiddlewareConfig;
  timeout?: number;
  maxRetries?: number;
}

export interface MockEnvironmentVars {
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  TETHERAI_TIMEOUT?: string;
  TETHERAI_MAX_RETRIES?: string;
}

export interface MockChatMessage {
  role: string;
  content: string;
}

export interface MockChatRequest {
  model: string;
  messages: MockChatMessage[];
}

export interface MockChatStreamChunk {
  delta: { content: string };
  done: boolean;
}

export interface MockRole {
  USER: string;
  ASSISTANT: string;
  SYSTEM: string;
}

export interface MockTypes {
  Role: MockRole;
  ChatMessage: MockChatMessage;
  ChatRequest: MockChatRequest;
  ChatStreamChunk: MockChatStreamChunk;
}

export interface MockModule {
  openAI?: (...args: unknown[]) => MockProvider;
  anthropic?: (...args: unknown[]) => MockProvider;
  withRetry: (...args: unknown[]) => MockProvider;
  withFallback: (...args: unknown[]) => MockProvider;
  ChatRequest: unknown;
  ChatMessage: unknown;
  ChatStreamChunk: unknown;
  OpenAIError?: new (message: string, status?: number) => MockError;
  AnthropicError?: new (message: string, status?: number) => MockError;
}

export interface MockSSE {
  parse: (chunk: string) => MockSSEParseResult;
  toIterable: (stream: unknown) => AsyncGenerator<MockSSEChunk>;
}

export interface MockResponse {
  body: string[] | string;
}

export interface MockFetchResponse {
  body: ReadableStream<Uint8Array> | string[];
  ok: boolean;
  status: number;
  statusText: string;
}

export interface MockRetryProvider extends MockProvider {
  retryCount: number;
  maxRetries: number;
}

export interface MockFallbackProvider extends MockProvider {
  providers: MockProvider[];
  currentProviderIndex: number;
}

// Utility types for function parameters
export type MockFunction<
  TArgs extends unknown[] = unknown[],
  TReturn = unknown,
> = (...args: TArgs) => TReturn;

export type MockAsyncFunction<
  TArgs extends unknown[] = unknown[],
  TReturn = unknown,
> = (...args: TArgs) => Promise<TReturn>;

export type MockGeneratorFunction<
  TArgs extends unknown[] = unknown[],
  TYield = unknown,
> = (...args: TArgs) => AsyncGenerator<TYield>;

// Type guards
export function isMockError(error: unknown): error is MockError {
  return error instanceof Error && "status" in error;
}

export function isMockProvider(provider: unknown): provider is MockProvider {
  return (
    typeof provider === "object" &&
    provider !== null &&
    "streamChat" in provider &&
    typeof (provider as MockProvider).streamChat === "function"
  );
}

export function isMockStreamChunk(chunk: unknown): chunk is MockStreamChunk {
  return (
    typeof chunk === "object" &&
    chunk !== null &&
    ("data" in chunk || "done" in chunk || "error" in chunk)
  );
}
