# @tetherai/anthropic

[![npm version](https://img.shields.io/npm/v/@tetherai/anthropic.svg)](https://www.npmjs.com/package/@tetherai/anthropic)
[![npm downloads](https://img.shields.io/npm/dm/@tetherai/anthropic.svg)](https://www.npmjs.com/package/@tetherai/anthropic)
[![Build](https://github.com/nbursa/TetherAI/actions/workflows/ci.yml/badge.svg)](https://github.com/nbursa/TetherAI/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> Anthropic provider package for **TetherAI**.

This package provides a **streaming‑first adapter** for the Anthropic Messages API.  
It follows the common `Provider` interface defined by TetherAI and supports middleware such as **retry** and **fallback**.  
Think of it as *Express for AI providers*.

## Features

- **Streaming‑first**: consume responses via `AsyncIterable`
- **Retry middleware**: automatic retries for transient errors (429, 5xx)
- **Fallback middleware**: chain multiple providers for resilience
- **Edge runtime compatible**: works in Next.js Edge, Vercel, Cloudflare Workers
- **Strict TypeScript**: fully typed, no `any`

## Quick Start

Install:

```bash
pnpm add @tetherai/anthropic
# or
npm install @tetherai/anthropic
# or
yarn add @tetherai/anthropic
```

Basic usage:

### Minimal usage

Set your API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Use in Node.js:

```ts
import { anthropic } from "@tetherai/anthropic";

const provider = anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

for await (const chunk of provider.streamChat({
  model: "claude-3-5-sonnet-20240620",
  messages: [{ role: "user", content: "Hello!" }],
})) {
  process.stdout.write(chunk.delta);
}
```

Use in Next.js (Edge API route)

```ts
// app/api/chat/route.ts
import { NextRequest } from "next/server";
import { anthropic, withRetry } from "@tetherai/anthropic";

export const runtime = "edge";

const provider = withRetry(anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }), {
  retries: 2,
});

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

## API Overview

- `anthropic(options)` → create Anthropic provider
- `provider.streamChat(request)` → async iterator of chat chunks
- `withRetry(provider, { retries })` → wrap a provider with retry middleware
- `withFallback([providerA, providerB])` → try multiple providers in order

## Middleware Examples

### With Retry

```ts
import { anthropic, withRetry } from "@tetherai/anthropic";

const provider = withRetry(
  anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }),
  { retries: 2 },
);
```

### With Fallback

```ts
import { anthropic, withFallback, withRetry } from "@tetherai/anthropic";

const provider = withFallback([
  withRetry(anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }), { retries: 2 }),
  anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }),
]);
```

## Examples

See [examples](https://github.com/nbursa/TetherAI/tree/main/examples) for ready‑to‑run demos:

- [Next.js chat app](https://github.com/nbursa/TetherAI/tree/main/examples/nextjs) – Edge runtime UI example
- [Node.js server](https://github.com/nbursa/TetherAI/tree/main/examples/node) – minimal backend SSE server

## Why TetherAI?

- Unified provider interface across AI vendors
- Streaming‑first by design
- Middleware composability (retry, fallback, logging)
- Edge & Node compatible
- 100% strict TypeScript

## License

[MIT](https://github.com/nbursa/TetherAI/blob/main/LICENSE)