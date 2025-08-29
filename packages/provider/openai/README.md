# @tetherai/openai

[![npm version](https://img.shields.io/npm/v/@tetherai/openai.svg)](https://www.npmjs.com/package/@tetherai/openai)
[![npm downloads](https://img.shields.io/npm/dm/@tetherai/openai.svg)](https://www.npmjs.com/package/@tetherai/openai)
[![Build](https://github.com/nbursa/TetherAI/actions/workflows/ci.yml/badge.svg)](https://github.com/nbursa/TetherAI/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Standalone OpenAI provider for TetherAI** - Everything you need in one package!

This package provides a **complete, streaming-first solution** for the OpenAI Chat Completions API.  
**No external dependencies required** - includes all types, utilities, and middleware built-in.  
Think of it as *Express for AI providers* with everything included.

## What's Included

- **OpenAI Provider**: Streaming chat completions with full API support
- **Enhanced Chat Options**: Temperature, maxTokens, topP, frequencyPenalty, presencePenalty, stop sequences, system prompts
- **Non-Streaming Chat**: Complete response handling for simple requests
- **Model Management**: List models, validate model IDs, get token limits
- **Retry Middleware**: Automatic retries with exponential backoff
- **Fallback Middleware**: Multi-provider failover support
- **Error Handling**: Rich error classes with HTTP status codes
- **Edge Runtime**: Works everywhere from Node.js to Cloudflare Workers
- **SSE Utilities**: Built-in Server-Sent Events parsing
- **TypeScript**: 100% typed with zero `any` types

## Quick Start

### Installation

```bash
npm install @tetherai/openai
# or
pnpm add @tetherai/openai
# or
yarn add @tetherai/openai
```

**That's it!** No additional packages needed - everything is included.

### Basic Usage

Set your API key:

```bash
export OPENAI_API_KEY=sk-...
```

#### Streaming Chat Example

```ts
import { openAI } from "@tetherai/openai";

const provider = openAI({ 
  apiKey: process.env.OPENAI_API_KEY!,
  timeout: 30000,        // 30 second timeout
  maxRetries: 2          // Built-in retry configuration
});

for await (const chunk of provider.streamChat({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello!" }],
  temperature: 0.7,      // Enhanced chat options
  maxTokens: 1000,
  systemPrompt: "You are a helpful assistant."
})) {
  if (chunk.done) break;
  process.stdout.write(chunk.delta);
}
```

#### Non-Streaming Chat Example

```ts
const response = await provider.chat({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello!" }],
  temperature: 0.5,
  maxTokens: 500,
  responseFormat: "json_object"  // Get structured responses
});

console.log(response.content);
console.log(`Used ${response.usage.totalTokens} tokens`);
```

#### Model Management Example

```ts
// Get available models
const models = await provider.getModels();
console.log("Available models:", models);

// Validate model ID
const isValid = provider.validateModel("gpt-4o-mini");
console.log("Model valid:", isValid);

// Get token limits
const maxTokens = provider.getMaxTokens("gpt-4o-mini");
console.log("Max tokens:", maxTokens);
```

#### Next.js Edge Runtime Example

```ts
// app/api/chat/route.ts
import { NextRequest } from "next/server";
import { openAI, withRetry } from "@tetherai/openai";

export const runtime = "edge";

const provider = withRetry(
  openAI({ 
    apiKey: process.env.OPENAI_API_KEY!,
    timeout: 30000,
    organization: process.env.OPENAI_ORG_ID, // Organization support
  }), 
  { retries: 2 }
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const stream = provider.streamChat({
    model: "gpt-4o-mini",
    messages: body.messages,
    temperature: body.temperature || 0.7,
    maxTokens: body.maxTokens || 1000,
    systemPrompt: body.systemPrompt,
    stop: body.stopSequences,
    responseFormat: body.responseFormat
  });

  return new Response(new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const chunk of stream) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }
      controller.close();
    },
  }), {
    headers: { "Content-Type": "text/event-stream" },
  });
}
```

## Enhanced Chat Options

### Advanced Chat Configuration

```ts
const response = await provider.chat({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Write a story" }],
  
  // Core parameters
  temperature: 0.8,           // 0-2, controls randomness
  maxTokens: 1000,            // Maximum response length
  topP: 0.9,                  // 0-1, nucleus sampling
  
  // Advanced parameters
  frequencyPenalty: 0.1,      // -2.0 to 2.0, reduce repetition
  presencePenalty: 0.1,       // -2.0 to 2.0, encourage new topics
  
  // Stop sequences
  stop: ["\n\n", "END"],      // Stop generation at these sequences
  
  // System behavior
  systemPrompt: "You are a creative storyteller", // Alternative to system messages
  
  // Response format
  responseFormat: "json_object", // Get structured JSON responses
  
  // Safety and moderation
  safeMode: true,              // Enable content filtering
  
  // Metadata
  user: "user123",             // User identifier for moderation
  metadata: {                  // Custom metadata
    sessionId: "abc123",
    source: "web"
  }
});
```

### Streaming with Enhanced Options

```ts
for await (const chunk of provider.streamChat({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Explain quantum physics" }],
  temperature: 0.3,            // More focused responses
  maxTokens: 2000,             // Longer explanation
  topP: 0.95,                 // High quality sampling
  frequencyPenalty: 0.2,      // Reduce repetition
  presencePenalty: 0.1,       // Encourage new concepts
  stop: ["\n\n", "In conclusion"], // Natural stopping points
  systemPrompt: "You are a physics professor explaining complex concepts simply"
})) {
  if (chunk.done) {
    console.log(`\nFinished: ${chunk.finishReason}`);
    console.log(`Usage: ${chunk.usage?.totalTokens} tokens`);
    break;
  }
  process.stdout.write(chunk.delta);
}
```

## Configuration Options

### OpenAI Provider Options

```ts
interface OpenAIOptions {
  apiKey: string;                    // Required: Your OpenAI API key
  baseURL?: string;                  // Custom API endpoint (default: https://api.openai.com/v1)
  organization?: string;             // OpenAI organization ID
  maxRetries?: number;               // Maximum retry attempts
  timeout?: number;                  // Request timeout in ms (default: 30000)
  fetch?: Function;                  // Custom fetch implementation
}
```

### Advanced Configuration

```ts
import { openAI } from "@tetherai/openai";

const provider = openAI({
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: "https://api.openai.com/v1",     // Custom endpoint
  organization: process.env.OPENAI_ORG_ID,   // Organization support
  timeout: 60000,                           // 60 second timeout
  maxRetries: 3,                            // 3 retry attempts
  fetch: customFetch                         // Custom fetch for proxies, etc.
});
```

## Middleware System

### Retry Middleware

Automatically retries failed requests with exponential backoff:

```ts
import { openAI, withRetry } from "@tetherai/openai";

const provider = withRetry(
  openAI({ apiKey: process.env.OPENAI_API_KEY! }),
  {
    retries: 3,        // Number of retry attempts
    baseMs: 300,       // Base delay in milliseconds
    factor: 2,         // Exponential backoff factor
    jitter: true       // Add randomness to prevent thundering herd
  }
);
```

**Smart Error Detection**: Only retries on transient errors (429 rate limits, 5xx server errors)

### Fallback Middleware

Chain multiple providers for automatic failover:

```ts
import { openAI, withFallback, withRetry } from "@tetherai/openai";
import { anthropic } from "@tetherai/anthropic";

const provider = withFallback([
  withRetry(openAI({ apiKey: process.env.OPENAI_API_KEY! }), { retries: 2 }),
  withRetry(anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }), { retries: 2 })
], {
  onFallback: (error, providerIndex) => {
    console.log(`Provider ${providerIndex} failed, trying next...`);
  }
});
```

## Error Handling

Rich error classes with detailed information:

```ts
import { OpenAIError } from "@tetherai/openai";

try {
  await provider.streamChat(request);
} catch (error) {
  if (error instanceof OpenAIError) {
    console.log(`OpenAI error ${error.status}: ${error.message}`);
    
    // Handle specific error types
    switch (error.status) {
      case 401: // Invalid API key
        console.log("Please check your API key");
        break;
      case 429: // Rate limited
        console.log("Rate limited - will retry automatically");
        break;
      case 500: // Server error
        console.log("OpenAI server error - will retry automatically");
        break;
    }
  }
}
```

## Edge Runtime Compatibility

Works seamlessly in modern edge environments:

- **Next.js Edge Runtime**
- **Vercel Edge Functions**
- **Cloudflare Workers**
- **Deno Deploy**
- **Node.js** (all versions)

## Performance Features

- **Streaming-First**: Real-time token streaming with `AsyncIterable`
- **Memory Efficient**: No buffering of entire responses
- **Automatic Retries**: Built-in resilience for production use
- **Edge Optimized**: Uses native `fetch` and `ReadableStream`
- **Enhanced Options**: Full control over response generation
- **Model Management**: Built-in model validation and token limits

## API Reference

### Core Functions

- `openAI(options)` → Creates OpenAI provider instance
- `provider.streamChat(request)` → AsyncIterable of chat chunks
- `provider.chat(request)` → Promise of complete chat response
- `provider.getModels()` → List available models
- `provider.validateModel(modelId)` → Check if model is supported
- `provider.getMaxTokens(modelId)` → Get token limit for model
- `withRetry(provider, options)` → Wraps provider with retry logic
- `withFallback(providers, options)` → Creates multi-provider failover

### Types

- `OpenAIOptions` → Configuration interface
- `OpenAIError` → Error class with HTTP status
- `ChatRequest` → Enhanced chat completion request
- `ChatStreamChunk` → Streaming response chunk with metadata
- `ChatResponse` → Complete chat response with usage info
- `Provider` → Common provider interface
- `ModelInfo` → Model capabilities and pricing

## Examples

See [examples](https://github.com/nbursa/TetherAI/tree/main/examples) for ready-to-run demos:

- [Next.js chat app](https://github.com/netherAI/TetherAI/tree/main/examples/nextjs) – Full Edge runtime UI example
- [Node.js server](https://github.com/netherAI/TetherAI/tree/main/examples/node) – Minimal backend SSE server

## Why This Package?

- **Zero Dependencies**: Everything included, no external packages needed
- **Production Ready**: Built-in retry, fallback, and error handling
- **Highly Configurable**: Timeouts, custom endpoints, organization support
- **Edge Compatible**: Works everywhere from Node.js to Cloudflare Workers
- **Streaming First**: Real-time token streaming with AsyncIterable
- **Enhanced Features**: Full chat options, model management, non-streaming support
- **Enterprise Ready**: Organization support, custom fetch, comprehensive error handling

## License

[MIT](https://github.com/netherAI/TetherAI/blob/main/LICENSE)
