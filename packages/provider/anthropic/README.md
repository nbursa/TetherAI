# @tetherai/anthropic

[![npm version](https://img.shields.io/npm/v/@tetherai/anthropic.svg)](https://www.npmjs.com/package/@tetherai/anthropic)
[![npm downloads](https://img.shields.io/npm/dm/@tetherai/anthropic.svg)](https://www.npmjs.com/package/@tetherai/anthropic)
[![Build](https://github.com/nbursa/TetherAI/actions/workflows/ci.yml/badge.svg)](https://github.com/nbursa/TetherAI/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Standalone Anthropic provider for TetherAI** - Everything you need in one package!

This package provides a **complete, streaming-first solution** for the Anthropic Messages API.  
**No external dependencies required** - includes all types, utilities, and middleware built-in.  
Think of it as *Express for AI providers* with everything included.

## What's Included

- **Anthropic Provider**: Streaming chat completions with full API support
- **Retry Middleware**: Automatic retries with exponential backoff
- **Fallback Middleware**: Multi-provider failover support
- **Error Handling**: Rich error classes with HTTP status codes
- **Edge Runtime**: Works everywhere from Node.js to Cloudflare Workers
- **SSE Utilities**: Built-in Server-Sent Events parsing
- **TypeScript**: 100% typed with zero `any` types

## Quick Start

### Installation

```bash
npm install @tetherai/anthropic
# or
pnpm add @tetherai/anthropic
# or
yarn add @tetherai/anthropic
```

**That's it!** No additional packages needed - everything is included.

### Basic Usage

Set your API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

#### Node.js Example

```ts
import { anthropic } from "@tetherai/anthropic";

const provider = anthropic({ 
  apiKey: process.env.ANTHROPIC_API_KEY!,
  timeout: 30000,        // 30 second timeout
  maxRetries: 2          // Built-in retry configuration
});

for await (const chunk of provider.streamChat({
  model: "claude-3-5-sonnet-20240620",
  messages: [{ role: "user", content: "Hello!" }],
})) {
  if (chunk.done) break;
  process.stdout.write(chunk.delta);
}
```

#### Next.js Edge Runtime Example

```ts
// app/api/chat/route.ts
import { NextRequest } from "next/server";
import { anthropic, withRetry } from "@tetherai/anthropic";

export const runtime = "edge";

const provider = withRetry(
  anthropic({ 
    apiKey: process.env.ANTHROPIC_API_KEY!,
    timeout: 30000,
    apiVersion: "2023-06-01", // API version control
  }), 
  { retries: 2 }
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const stream = provider.streamChat({
    model: "claude-3-5-sonnet-20240620",
    messages: body.messages,
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

## Configuration Options

### Anthropic Provider Options

```ts
interface AnthropicOptions {
  apiKey: string;           // Required: Your Anthropic API key
  baseURL?: string;         // Custom API endpoint (default: https://api.anthropic.com/v1)
  apiVersion?: string;      // API version (default: 2023-06-01)
  maxRetries?: number;      // Maximum retry attempts
  timeout?: number;         // Request timeout in ms (default: 30000)
  fetch?: Function;         // Custom fetch implementation
}
```

### Advanced Configuration

```ts
import { anthropic } from "@tetherai/anthropic";

const provider = anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  baseURL: "https://api.anthropic.com/v1", // Custom endpoint
  apiVersion: "2023-06-01",                // Specific API version
  timeout: 60000,                          // 60 second timeout
  maxRetries: 3,                           // 3 retry attempts
  fetch: customFetch                       // Custom fetch for proxies, etc.
});
```

## Middleware System

### Retry Middleware

Automatically retries failed requests with exponential backoff:

```ts
import { anthropic, withRetry } from "@tetherai/anthropic";

const provider = withRetry(
  anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }),
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
import { anthropic, withFallback, withRetry } from "@tetherai/anthropic";
import { openAI } from "@tetherai/openai";

const provider = withFallback([
  withRetry(anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }), { retries: 2 }),
  withRetry(openAI({ apiKey: process.env.OPENAI_API_KEY! }), { retries: 2 })
], {
  onFallback: (error, providerIndex) => {
    console.log(`Provider ${providerIndex} failed, trying next...`);
  }
});
```

## Error Handling

Rich error classes with detailed information:

```ts
import { AnthropicError } from "@tetherai/anthropic";

try {
  await provider.streamChat(request);
} catch (error) {
  if (error instanceof AnthropicError) {
    console.log(`Anthropic error ${error.status}: ${error.message}`);
    
    // Handle specific error types
    switch (error.status) {
      case 401: // Invalid API key
        console.log("Please check your API key");
        break;
      case 429: // Rate limited
        console.log("Rate limited - will retry automatically");
        break;
      case 500: // Server error
        console.log("Anthropic server error - will retry automatically");
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

## API Reference

### Core Functions

- `anthropic(options)` → Creates Anthropic provider instance
- `provider.streamChat(request)` → AsyncIterable of chat chunks
- `withRetry(provider, options)` → Wraps provider with retry logic
- `withFallback(providers, options)` → Creates multi-provider failover

### Types

- `AnthropicOptions` → Configuration interface
- `AnthropicError` → Error class with HTTP status
- `ChatRequest` → Chat completion request
- `ChatStreamChunk` → Streaming response chunk
- `Provider` → Common provider interface

## Examples

See [examples](https://github.com/nbursa/TetherAI/tree/main/examples) for ready-to-run demos:

- [Next.js chat app](https://github.com/netherAI/TetherAI/tree/main/examples/nextjs) – Full Edge runtime UI example
- [Node.js server](https://github.com/netherAI/TetherAI/tree/main/examples/node) – Minimal backend SSE server

## Why This Package?

- **Zero Dependencies**: Everything included, no external packages needed
- **Production Ready**: Built-in retry, fallback, and error handling
- **Highly Configurable**: Timeouts, custom endpoints, API version control
- **Edge Compatible**: Works everywhere from Node.js to Cloudflare Workers
- **Streaming First**: Real-time token streaming with AsyncIterable
- **Enterprise Ready**: API version control, custom fetch, comprehensive error handling

## License

[MIT](https://github.com/netherAI/TetherAI/blob/main/LICENSE)
