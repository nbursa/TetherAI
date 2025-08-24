# TetherAI

TetherAI is a modular TypeScript platform for integrating different AI providers.  
It focuses on **simplicity**, **streaming-first APIs**, and **composable middleware** such as retry and fallback.  
Think of it as *“Express for AI providers”*.

---

## Structure

- `packages/` – contains AI providers as separate packages.
- `examples/` – contains demo applications (Next.js, Node.js, etc).

---

## Quick Start

Install a provider package (for now, OpenAI):

```bash
npm install @tetherai/provider-openai
```

Create a client:

```ts
import { openAI, withRetry, withFallback, type ChatRequest } from "@tetherai/provider-openai";

const provider = withFallback(
  [
    withRetry(openAI({ apiKey: process.env.OPENAI_API_KEY! }), { retries: 2 }),
    // later: other providers like Anthropic, Mistral...
  ]
);

async function run() {
  const req: ChatRequest = {
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "Hello world" }],
  };

  for await (const chunk of provider.streamChat(req)) {
    process.stdout.write(chunk.delta);
  }
}

run();
```

---

## Features

- **Streaming-first** – token stream via `AsyncIterable`.
- **Retry middleware** – automatic retry on transient errors (429, 5xx).
- **Fallback middleware** – try multiple providers/models in order.
- **Edge compatible** – works with `fetch`, `ReadableStream`, and modern runtimes.
- **TypeScript strict** – 100% typed, no `any`.

---

## Usage

TetherAI is designed to make it easy to compose AI provider clients and middleware.

### Creating a Provider

```ts
import { openAI } from "@tetherai/provider-openai";

const provider = openAI({ apiKey: process.env.OPENAI_API_KEY! });
```

### Adding Retry and Fallback

```ts
import { withRetry, withFallback } from "@tetherai/provider-openai";

const resilientProvider = withFallback([
  withRetry(openAI({ apiKey: process.env.OPENAI_API_KEY! }), { retries: 2 }),
  // Add other providers for fallback as needed
]);
```

### Streaming Chat Completion

```ts
const req = {
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Tell me a joke." }]
};

for await (const chunk of resilientProvider.streamChat(req)) {
  process.stdout.write(chunk.delta);
}
```

---

## Examples

See [examples/](./examples) for ready-to-run demos.

- [Next.js Chat](./examples/nextjs) – Edge runtime chat UI with streaming and retry/fallback middleware.

Run locally:

```bash
cd examples/nextjs
npm install
export OPENAI_API_KEY=sk-...
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## License

MIT
