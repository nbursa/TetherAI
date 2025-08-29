# @tetherai/mistral

Mistral AI provider for TetherAI - **completely standalone** with streaming-first API and built-in middleware.

## Installation

```bash
npm install @tetherai/mistral
# or
yarn add @tetherai/mistral
# or
pnpm add @tetherai/mistral
```

**No other dependencies required!**

## Quick Start

```typescript
import { mistral, type ChatRequest } from "@tetherai/mistral";

// Create provider
const provider = mistral({
  apiKey: process.env.MISTRAL_API_KEY!,
});

// Use it
const request: ChatRequest = {
  model: "mistral-medium-latest",
  messages: [
    { role: "user", content: "Hello!" }
  ],
};

for await (const chunk of provider.streamChat(request)) {
  if (chunk.delta) {
    process.stdout.write(chunk.delta);
  }
}
```

## What's Included

- **Core Types**: `ChatRequest`, `ChatMessage`, `Provider`, etc.  
- **Mistral Implementation**: Streaming chat completion  
- **SSE Utilities**: Server-Sent Events handling  
- **Middleware**: Retry and fallback functionality  
- **Error Handling**: Mistral-specific error types  
- **Enhanced Chat Options**: Temperature, max tokens, top-p, etc.
- **Model Management**: List, validate, and get token limits
- **Non-Streaming Chat**: Single response method

## Enhanced Chat Options

```typescript
const request: ChatRequest = {
  model: "mistral-large-latest",
  messages: [
    { role: "user", content: "Explain quantum computing" }
  ],
  temperature: 0.7,
  maxTokens: 1000,
  topP: 0.9,
  frequencyPenalty: 0.1,
  presencePenalty: 0.1,
  stop: ["END", "STOP"],
  systemPrompt: "You are a helpful AI assistant.",
  responseFormat: "text", // or "json_object"
  safeMode: true,
  user: "user123"
};
```

## Non-Streaming Chat

```typescript
// Get a single, complete response
const response = await provider.chat(request);
console.log(response.content);
console.log(`Tokens used: ${response.usage.totalTokens}`);
```

## Model Management

```typescript
// Get available models
const models = await provider.getModels();
console.log("Available models:", models);

// Validate a model ID
const isValid = provider.validateModel("mistral-large-latest");
console.log("Model valid:", isValid);

// Get max tokens for a model
const maxTokens = provider.getMaxTokens("mistral-large-latest");
console.log("Max tokens:", maxTokens); // 32768
```

## Supported Models

- **Large Models**: `mistral-large-latest` (32K tokens)
- **Medium Models**: `mistral-medium-latest` (16K tokens)  
- **Small Models**: `mistral-small-latest` (8K tokens)
- **7B Models**: `mistral-7b-instruct`, `mistral-7b-instruct-v0.2`, `mistral-7b-instruct-v0.3` (8K tokens)
- **Open Models**: `open-mistral-7b` (8K tokens), `open-mixtral-8x7b` (32K tokens), `open-mixtral-8x22b` (64K tokens)

## Middleware Usage

```typescript
import { mistral, withRetry, withFallback } from "@tetherai/mistral";

const baseProvider = mistral({ 
  apiKey: process.env.MISTRAL_API_KEY! 
});

// Add retry logic
const resilientProvider = withRetry(baseProvider, {
  retries: 3,
  baseMs: 500,
});

// Add fallback logic
const fallbackProvider = withFallback([
  mistral({ apiKey: process.env.MISTRAL_API_KEY! }),
  mistral({ apiKey: process.env.MISTRAL_API_KEY_2! }),
]);
```

## Configuration Options

```typescript
const provider = mistral({
  apiKey: "your-api-key",
  baseURL: "https://api.mistral.ai/v1", // optional
  timeout: 30000, // optional, default: 30000ms
  maxRetries: 3, // optional, default: 3
  fetch: customFetch, // optional, custom fetch implementation
});
```

## Environment Variables

```bash
MISTRAL_API_KEY=your-api-key
MISTRAL_BASE_URL=https://api.mistral.ai/v1
MISTRAL_TIMEOUT=30000
MISTRAL_MAX_RETRIES=3
```

## Error Handling

```typescript
try {
  const response = await provider.chat(request);
} catch (error) {
  if (error instanceof MistralError) {
    console.error(`Mistral error ${error.status}: ${error.message}`);
  } else {
    console.error("Unexpected error:", error);
  }
}
```

## Why Standalone?

- **Faster Installation**: No extra dependencies
- **Smaller Bundle**: Only what you need
- **Easier Maintenance**: Self-contained package
- **Focused**: Mistral-specific functionality only

## Examples

See the examples directory for complete working examples.

## License

MIT
