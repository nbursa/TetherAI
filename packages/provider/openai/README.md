# @tetherai/openai

[![npm version](https://img.shields.io/npm/v/@tetherai/openai.svg)](https://www.npmjs.com/package/@tetherai/openai)
[![npm downloads](https://img.shields.io/npm/dm/@tetherai/openai.svg)](https://www.npmjs.com/package/@tetherai/openai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Build](https://github.com/nbursa/TetherAI/actions/workflows/ci.yml/badge.svg)](https://github.com/nbursa/TetherAI/actions)

> OpenAI provider package for **TetherAI**.

This package provides a **streaming‑first adapter** for the OpenAI Chat Completions API.  
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
pnpm add @tetherai/openai
# or
npm install @tetherai/openai
# or
yarn add @tetherai/openai
```

Basic usage:

```ts
import { openAI } from "@tetherai/openai";

const provider = openAI({ apiKey: process.env.OPENAI_API_KEY! });

for await (const chunk of provider.streamChat({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello!" }],
})) {
  process.stdout.write(chunk.delta);
}
```

## API Overview

- `openAI(options)` → create OpenAI provider
- `provider.streamChat(request)` → async iterator of chat chunks
- `withRetry(provider, { retries })` → wrap a provider with retry middleware
- `withFallback([providerA, providerB])` → try multiple providers in order

## Middleware Examples

### With Retry

```ts
import { openAI, withRetry } from "@tetherai/openai";

const provider = withRetry(
  openAI({ apiKey: process.env.OPENAI_API_KEY! }),
  { retries: 2 },
);
```

### With Fallback

```ts
import { openAI, withFallback, withRetry } from "@tetherai/openai";

const provider = withFallback([
  withRetry(openAI({ apiKey: process.env.OPENAI_API_KEY! }), { retries: 2 }),
  openAI({ apiKey: process.env.OPENAI_API_KEY! }),
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
