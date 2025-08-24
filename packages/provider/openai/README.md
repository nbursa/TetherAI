# @tetherai/openai v0.0.2

>OpenAI provider package for **TetherAI**.

This package implements a streaming-first adapter for the OpenAI Chat Completions API. It follows the common `Provider` interface defined by TetherAI and supports middleware such as retry and fallback.

## Features

- **Streaming-first**: consume responses via `AsyncIterable`  
- **Retry middleware**: automatic retries for transient errors (429, 5xx)  
- **Fallback middleware**: chain multiple providers for resilience  
- **Edge runtime compatible**: works in Next.js Edge, Vercel, Cloudflare Workers  
- **Strict TypeScript types**: fully typed, no `any`  

## Installation

```bash
pnpm install @tetherai/openai
# or: npm install / yarn install
```

## Usage

### Basic Provider

```ts
import { openAI } from "@tetherai/openai";

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
import { openAI, withRetry } from "@tetherai/openai";

const provider = withRetry(openAI({ apiKey: process.env.OPENAI_API_KEY! }), {
  retries: 2,
});
```

### With Fallback Middleware

```ts
import { openAI, withFallback, withRetry } from "@tetherai/openai";

const provider = withFallback([
  withRetry(openAI({ apiKey: process.env.OPENAI_API_KEY! }), { retries: 2 }),
]);
```

## Examples

See [TetherAI examples](https://github.com/nbursa/TetherAI/tree/main/examples) for ready-to-run demos, including a Next.js chat app.

## License

[MIT](https://github.com/nbursa/TetherAI/blob/main/LICENSE)
