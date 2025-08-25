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
