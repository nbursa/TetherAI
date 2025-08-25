# TetherAI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Build](https://github.com/nbursa/TetherAI/actions/workflows/ci.yml/badge.svg)](https://github.com/nbursa/TetherAI/actions)

TetherAI is a modular **TypeScript** platform for integrating different AI providers.  
It focuses on **simplicity**, **streaming‑first APIs**, and **composable middleware** such as **retry** and **fallback**.  
Think of it as _“Express for AI providers”_.

## Structure

- `packages/` – separate provider packages.
- `examples/` – demo applications (Next.js, Node.js, etc.).

## Quick Start

1. Install a provider package (**pnpm preferred**; npm or yarn also work):

   ```bash
   pnpm install @tetherai/openai
   ```

2. Run an example locally:

      a. **Next.js example:**

      ```bash
      cd examples/nextjs
      pnpm install
      export OPENAI_API_KEY=sk-...
      pnpm dev
      ```

      b. **Node.js example:**

      ```bash
      cd examples/node
      pnpm install
      export OPENAI_API_KEY=sk-...
      pnpm dev
      ```

3. Try it out:

   a. **Next.js:** Open <http://localhost:3000>.

   b. **Node.js:** POST to <http://localhost:8787/chat>:

      ```bash
      curl -N -X POST http://localhost:8787/chat \
        -H "Content-Type: application/json" \
        -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello!"}]}'
      ```

## Usage

TetherAI makes it easy to compose AI provider clients and middleware.

### Create a Provider

```ts
import { openAI } from "@tetherai/openai";

const provider = openAI({ apiKey: process.env.OPENAI_API_KEY! });
```

### Add Retry and Fallback

```ts
import { withRetry, withFallback } from "@tetherai/openai";

const resilientProvider = withFallback([
  withRetry(openAI({ apiKey: process.env.OPENAI_API_KEY! }), { retries: 2 }),
]);
```

### Stream a Chat Completion

```ts
import type { ChatRequest } from "@tetherai/openai";

const req: ChatRequest = {
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Tell me a joke." }],
};

for await (const chunk of resilientProvider.streamChat(req)) {
  process.stdout.write(chunk.delta);
}
```

Make sure to set OPENAI_API_KEY in your environment.

## Features

- Streaming‑first – token stream via AsyncIterable
- Retry middleware – automatic retry on transient errors (429, 5xx)
- Fallback middleware – try multiple providers/models in order
- Edge compatible – built on fetch, ReadableStream, modern runtimes
- Strict TypeScript – 100% typed, no any

## Available Providers

- [@tetherai/openai](https://www.npmjs.com/package/@tetherai/openai)  
  Streaming-first OpenAI adapter with retry & fallback middleware.\
  [README](https://github.com/nbursa/TetherAI/blob/main/packages/provider/openai/README.md)

  [![npm version](https://img.shields.io/npm/v/@tetherai/openai.svg)](https://www.npmjs.com/package/@tetherai/openai)
  [![npm downloads](https://img.shields.io/npm/dm/@tetherai/openai.svg)](https://www.npmjs.com/package/@tetherai/openai)

- [@tetherai/anthropic](https://www.npmjs.com/package/@tetherai/anthropic)  
  Streaming-first OpenAI adapter with retry & fallback middleware.\
  [README](https://github.com/nbursa/TetherAI/blob/main/packages/provider/anthropic/README.md)

  [![npm version](https://img.shields.io/npm/v/@tetherai/anthropic.svg)](https://www.npmjs.com/package/@tetherai/anthropic)
  [![npm downloads](https://img.shields.io/npm/dm/@tetherai/anthropic.svg)](https://www.npmjs.com/package/@tetherai/anthropic)

## Examples

See examples/ for ready‑to‑run demos:

- Next.js Chat – Edge runtime chat UI with streaming and retry/fallback middleware.
- Node.js Server – Minimal backend HTTP server exposing `/chat` endpoint with SSE streaming.

## License

[MIT](LICENSE)
