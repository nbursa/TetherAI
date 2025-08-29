# @tetherai/grok

[![npm version](https://img.shields.io/npm/v/@tetherai/grok.svg)](https://www.npmjs.com/package/@tetherai/grok)
[![npm downloads](https://img.shields.io/npm/dm/@tetherai/grok.svg)](https://www.npmjs.com/package/@tetherai/grok)
[![Build](https://github.com/nbursa/TetherAI/actions/workflows/ci.yml/badge.svg)](https://github.com/nbursa/TetherAI/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/nbursa/TetherAI/blob/HEAD/LICENSE)

> **Standalone Grok provider for TetherAI** - Everything you need in one package!

This package provides a **complete, streaming-first solution** for the Grok AI (xAI) Chat Completions API.  
**No external dependencies required** - includes all types, utilities, and middleware built-in.  
Think of it as *Express for AI providers* with everything included.

## What's Included

- **Grok Provider**: Streaming chat completions with full API support
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
npm install @tetherai/grok
# or
pnpm add @tetherai/grok
# or
yarn add @tetherai/grok
```

**That's it!** No additional packages needed - everything is included.

### Basic Usage

Set your API key:

```bash
export GROK_API_KEY=sk-...
```

#### Streaming Chat Example

```ts
import { grok } from "@tetherai/grok";

const provider = grok({ 
  apiKey: process.env.GROK_API_KEY!,
  timeout: 30000,        // 30 second timeout
  maxRetries: 2          // Built-in retry configuration
});

for await (const chunk of provider.streamChat({
  model: "grok-beta",
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
  model: "grok-beta",
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
const isValid = provider.validateModel("grok-beta");
console.log("Model valid:", isValid);

// Get token limits
const maxTokens = provider.getMaxTokens("grok-beta");
console.log("Max tokens:", maxTokens);
```

## Parameter Mapping

| TS Interface Field  | Grok API Field             |
|---------------------|----------------------------|
| `maxTokens`         | `max_tokens`               |
| `topP`              | `top_p`                    |
| `responseFormat`    | `response_format.type`     |

Grok follows an OpenAI‑compatible schema and these fields are mapped automatically.

## Middleware Compatibility

| Feature        | Support |
|----------------|---------|
| `withRetry`    | ✅       |
| `withFallback` | ✅       |

## Configuration Options

### Grok Provider Options

```ts
interface GrokOptions {
  apiKey: string;                    // Required: Your xAI API key
  baseURL?: string;                  // Custom API endpoint (default: https://api.x.ai/v1)
  timeout?: number;                  // Request timeout in ms (default: 30000)
  fetch?: Function;                  // Custom fetch implementation
}
```

### Supported Models

Grok provider supports the following models:

| Model | Context Window | Description |
|-------|----------------|-------------|
| `grok-beta` | 8K tokens | Base Grok model |
| `grok-beta-vision` | 128K tokens | Grok with vision capabilities |
| `grok-beta-2` | 128K tokens | Enhanced Grok model |
| `grok-beta-2-vision` | 128K tokens | Enhanced Grok with vision |
| `grok-2` | 128K tokens | Latest Grok 2 model |
| `grok-2-vision` | 128K tokens | Latest Grok 2 with vision |
| `grok-2-mini` | 128K tokens | Compact Grok 2 model |
| `grok-2-mini-vision` | 128K tokens | Compact Grok 2 with vision |

> **Note**: Vision models support image input and have larger context windows.

## Middleware

### Retry Middleware

```ts
import { withRetry } from "@tetherai/grok";

const retryProvider = withRetry(provider, {
  maxRetries: 3,
  retryDelay: 1000,
  shouldRetry: (error) => error.status >= 500
});

// Use with automatic retries
const response = await retryProvider.chat({
  model: "grok-beta",
  messages: [{ role: "user", content: "Hello" }]
});
```

### Fallback Middleware

```ts
import { withFallback } from "@tetherai/grok";

const fallbackProvider = withFallback(provider, {
  fallbackProvider: backupProvider,
  shouldFallback: (error) => error.status === 429
});

// Automatically fallback on rate limits
const response = await fallbackProvider.chat({
  model: "grok-beta",
  messages: [{ role: "user", content: "Hello" }]
});
```

## Advanced Examples

### Streaming with System Prompt

```ts
const stream = provider.streamChat({
  model: "grok-beta",
  messages: [
    { role: "user", content: "Write a Python function to calculate fibonacci numbers" }
  ],
  systemPrompt: "You are a helpful coding assistant. Always provide working code examples.",
  temperature: 0.3,
  maxTokens: 2000
});

let fullResponse = "";
for await (const chunk of stream) {
  if (chunk.done) break;
  fullResponse += chunk.delta;
  process.stdout.write(chunk.delta);
}

console.log("\n\nFull response:", fullResponse);
```

### Error Recovery with Fallback

```ts
import { grok } from "@tetherai/grok";
import { withFallback } from "@tetherai/grok";

const grokProvider = grok({ apiKey: process.env.GROK_API_KEY! });
const backupProvider = openAI({ apiKey: process.env.OPENAI_API_KEY! });

const fallbackProvider = withFallback(grokProvider, {
  fallbackProvider: backupProvider,
  shouldFallback: (error) => error.status === 429 || error.status >= 500
});

try {
  const response = await fallbackProvider.chat({
    model: "grok-beta",
    messages: [{ role: "user", content: "Hello" }]
  });
  console.log("Response:", response.content);
} catch (error) {
  console.error("Both providers failed:", error);
}
```

### Custom Fetch Implementation

```ts
const customProvider = grok({
  apiKey: process.env.GROK_API_KEY!,
  fetch: async (url, options) => {
    // Add custom headers
    const customOptions = {
      ...options,
      headers: {
        ...options.headers,
        'X-Custom-Header': 'value'
      }
    };
    
    return fetch(url, customOptions);
  }
});
```

## TypeScript

Full TypeScript support with zero `any` types:

```ts
import { 
  grok, 
  GrokOptions, 
  GrokError, 
  ChatResponse,
  StreamChatOptions 
} from "@tetherai/grok";

const options: GrokOptions = {
  apiKey: process.env.GROK_API_KEY!,
  baseURL: "https://api.x.ai/v1",
  timeout: 30000
};

const provider = grok(options);

async function chatWithGrok(options: StreamChatOptions): Promise<ChatResponse> {
  try {
    return await provider.chat(options);
  } catch (error) {
    if (error instanceof GrokError) {
      console.error(`Grok error: ${error.message}`);
    }
    throw error;
  }
}
```

## Edge Runtime Support

Works everywhere from Node.js to Cloudflare Workers:

```ts
// Cloudflare Worker
export default {
  async fetch(request: Request): Promise<Response> {
    const provider = grok({ 
      apiKey: env.GROK_API_KEY,
      fetch: globalThis.fetch 
    });
    
    const response = await provider.chat({
      model: "grok-beta",
      messages: [{ role: "user", content: "Hello from Cloudflare!" }]
    });
    
    return new Response(response.content);
  }
};
```

## Performance Tips

- **Use streaming** for real-time responses
- **Set appropriate timeouts** for your use case
- **Implement retry logic** for production reliability
- **Use fallback providers** for high availability
- **Batch requests** when possible

## License

[MIT](https://github.com/nbursa/TetherAI/blob/HEAD/LICENSE)
