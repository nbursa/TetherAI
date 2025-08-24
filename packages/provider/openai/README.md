# OpenAI provider for TetherAI

## @tetherai/provider-openai

OpenAI provider package for **TetherAI**.

This package implements a streaming-first adapter for the OpenAI Chat Completions API.  
It follows the common `Provider` interface defined by TetherAI and supports middleware such as retry and fallback.

---

## Installation

```bash
pnpm install @tetherai/provider-openai
# or: npm install / yarn install
```

---

## Usage

### Basic Provider

```ts
import { openAI } from "@tetherai/provider-openai";

const provider = openAI({ apiKey: process.env.OPENAI_API_KEY! });

const req = {
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello!" }],
};

for await (const chunk of provider.streamChat(req)) {
  process.stdout.write(chunk.delta);
}
```

### With Retry Middleware

```ts
import { openAI, withRetry } from "@tetherai/provider-openai";

const provider = withRetry(openAI({ apiKey: process.env.OPENAI_API_KEY! }), {
  retries: 2,
});
```

### With Fallback Middleware

```ts
import { openAI, withFallback, withRetry } from "@tetherai/provider-openai";

const provider = withFallback([
  withRetry(openAI({ apiKey: process.env.OPENAI_API_KEY! }), { retries: 2 }),
  // add other providers here in the future
]);
```

---

## Features

- **Streaming-first** via `AsyncIterable`
- **Retry** middleware for transient errors (429, 5xx)
- **Fallback** middleware for multi-provider resilience
- **Edge runtime compatible**
- **100% TypeScript** with strict types

---

## Examples

See [TetherAI examples](../../../examples) for ready-to-run demos, including a Next.js chat app.

---

## License

MIT
