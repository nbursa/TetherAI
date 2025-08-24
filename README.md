# TetherAI

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

2. Run the Next.js example locally:

   ```bash
   cd examples/nextjs
   pnpm install
   export OPENAI_API_KEY=sk-...
   pnpm dev
   ```

3. Open <http://localhost:3000>.

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

Make sure to set OPENAI_API_KEY in your environment (or .env.local in Next.js).

## Features

- Streaming‑first – token stream via AsyncIterable
- Retry middleware – automatic retry on transient errors (429, 5xx)
- Fallback middleware – try multiple providers/models in order
- Edge compatible – built on fetch, ReadableStream, modern runtimes
- Strict TypeScript – 100% typed, no any

## Examples

See examples/ for ready‑to‑run demos:

- Next.js Chat – Edge runtime chat UI with streaming and retry/fallback middleware.

### Quick run

```bash
cd examples/nextjs
pnpm install
export OPENAI_API_KEY=sk-...
pnpm dev
```

## License

[MIT](LICENSE)
