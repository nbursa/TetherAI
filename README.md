# TetherAI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Build](https://github.com/nbursa/TetherAI/actions/workflows/ci.yml/badge.svg)](https://github.com/nbursa/TetherAI/actions)

TetherAI is a **standalone-first** TypeScript platform for integrating different AI providers.  
Each package is **completely self-contained** with no external dependencies - includes all types, utilities, and middleware built-in.  
Think of it as _"Express for AI providers" with everything included_.

## What's New

- **Standalone Packages**: Each provider is completely independent
- **Enhanced Configuration**: Timeouts, custom endpoints, organization support
- **Advanced Middleware**: Retry with exponential backoff, multi-provider fallback
- **Rich Error Handling**: Provider-specific error classes with HTTP status codes
- **Edge Runtime**: Works everywhere from Node.js to Cloudflare Workers
- **SSE Utilities**: Built-in Server-Sent Events parsing

## Architecture

- `packages/provider/` – **standalone provider packages** (no external deps)
- `packages/shared/` – internal development tooling (not published)
- `examples/` – demo applications (Next.js, Node.js, etc.)

## Quick Start

1. **Install any provider package** (everything included):

   ```bash
   npm install @tetherai/openai
   # or
   npm install @tetherai/anthropic
   ```

2. **Run an example locally**:

   a. **Next.js example:**

   ```bash
   cd examples/nextjs
   npm install
   export OPENAI_API_KEY=sk-...
   npm run dev
   ```

   b. **Node.js example:**

   ```bash
   cd examples/node
   npm install
   export OPENAI_API_KEY=sk-...
   npm run dev
   ```

3. **Try it out**:

   a. **Next.js:** Open <http://localhost:3000>

   b. **Node.js:** POST to <http://localhost:8787/chat>:

      ```bash
      curl -N -X POST http://localhost:8787/chat \
        -H "Content-Type: application/json" \
        -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello!"}]}'
      ```

## Usage

### Create a Provider

```ts
import { openAI } from "@tetherai/openai";

const provider = openAI({ 
  apiKey: process.env.OPENAI_API_KEY!,
  timeout: 30000,        // 30 second timeout
  organization: process.env.OPENAI_ORG_ID  // Organization support
});
```

### Add Retry and Fallback

```ts
import { withRetry, withFallback } from "@tetherai/openai";
import { anthropic } from "@tetherai/anthropic";

const resilientProvider = withFallback([
  withRetry(openAI({ apiKey: process.env.OPENAI_API_KEY! }), { 
    retries: 3,
    baseMs: 300,
    factor: 2,
    jitter: true
  }),
  withRetry(anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }), { 
    retries: 2 
  })
], {
  onFallback: (error, providerIndex) => {
    console.log(`Provider ${providerIndex} failed, trying next...`);
  }
});
```

### Stream a Chat Completion

```ts
import type { ChatRequest } from "@tetherai/openai";

const req: ChatRequest = {
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Tell me a joke." }],
};

for await (const chunk of resilientProvider.streamChat(req)) {
  if (chunk.done) break;
  process.stdout.write(chunk.delta);
}
```

## Features

- **Streaming-First**: Token stream via AsyncIterable with SSE support
- **Retry Middleware**: Automatic retry with exponential backoff on transient errors (429, 5xx)
- **Fallback Middleware**: Multi-provider failover with configurable callbacks
- **Edge Compatible**: Built on fetch, ReadableStream, works in all modern runtimes
- **Strict TypeScript**: 100% typed, zero `any` types
- **Rich Error Handling**: Provider-specific error classes with HTTP status codes
- **Highly Configurable**: Timeouts, custom endpoints, organization support

## Available Providers

### [@tetherai/openai](https://www.npmjs.com/package/@tetherai/openai)

**Standalone OpenAI provider** - Everything you need in one package! 🚀

- **Zero Dependencies**: Everything included, no external packages needed
- **Production Ready**: Built-in retry, fallback, and error handling
- **Highly Configurable**: Timeouts, custom endpoints, organization support
- **Edge Compatible**: Works everywhere from Node.js to Cloudflare Workers

[![npm version](https://img.shields.io/npm/v/@tetherai/openai.svg)](https://www.npmjs.com/package/@tetherai/openai)
[![npm downloads](https://img.shields.io/npm/dm/@tetherai/openai.svg)](https://www.npmjs.com/package/@tetherai/openai)

[Full README](https://github.com/nbursa/TetherAI/blob/main/packages/provider/openai/README.md)

### [@tetherai/anthropic](https://www.npmjs.com/package/@tetherai/anthropic)

**Standalone Anthropic provider** - Everything you need in one package! 🚀

- **Zero Dependencies**: Everything included, no external packages needed
- **Production Ready**: Built-in retry, fallback, and error handling
- **Highly Configurable**: Timeouts, custom endpoints, API version control
- **Edge Compatible**: Works everywhere from Node.js to Cloudflare Workers

[![npm version](https://img.shields.io/npm/v/@tetherai/anthropic.svg)](https://www.npmjs.com/package/@tetherai/anthropic)
[![npm downloads](https://img.shields.io/npm/dm/@tetherai/anthropic.svg)](https://www.npmjs.com/package/@tetherai/anthropic)

[Full README](https://github.com/nbursa/TetherAI/blob/main/packages/provider/anthropic/README.md)

## Why TetherAI?

- **Zero Dependencies**: Each package is completely standalone
- **Production Ready**: Built-in retry, fallback, and error handling
- **Highly Configurable**: Timeouts, custom endpoints, organization support
- **Edge Compatible**: Works everywhere from Node.js to Cloudflare Workers
- **Streaming First**: Real-time token streaming with AsyncIterable
- **Enterprise Ready**: Organization support, custom fetch, comprehensive error handling

## Examples

See [examples/](https://github.com/nbursa/TetherAI/tree/main/examples) for ready-to-run demos:

- **Next.js Chat** – Full Edge runtime chat UI with streaming and retry/fallback middleware
- **Node.js Server** – Minimal backend HTTP server exposing `/chat` endpoint with SSE streaming

## Development

### Building

```bash
# Build all providers
npm run build:providers

# Build individual providers
npm run build:openai
npm run build:anthropic

# Copy shared files to providers
npm run copy-shared
```

### Testing

```bash
# Test standalone providers
node test-standalone.js
```

## License

[MIT](LICENSE)
