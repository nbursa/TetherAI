# @tetherai/local

[![npm version](https://img.shields.io/npm/v/@tetherai/local.svg)](https://www.npmjs.com/package/@tetherai/local)
[![npm downloads](https://img.shields.io/npm/dm/@tetherai/local.svg)](https://www.npmjs.com/package/@tetherai/local)
[![Build](https://github.com/nbursa/TetherAI/actions/workflows/ci.yml/badge.svg)](https://github.com/nbursa/TetherAI/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/nbursa/TetherAI/blob/HEAD/LICENSE)

> **Standalone Local LLM provider for TetherAI** - Everything you need in one package!

This package provides a **complete, streaming-first solution** for local LLM models via OpenAI-compatible APIs.  
**No external dependencies required** - includes all types, utilities, and middleware built-in.  
Think of it as *Express for AI providers* with everything included.

## What's Included

- **Local LLM Provider**: Streaming chat completions with full API support
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
npm install @tetherai/local
# or
pnpm add @tetherai/local
# or
yarn add @tetherai/local
```

**That's it!** No additional packages needed - everything is included.

### Basic Usage

Set your local endpoint:

```bash
export LOCAL_LLM_URL=http://localhost:11434
```

#### Streaming Chat Example

```ts
import { localLLM } from "@tetherai/local";

const provider = localLLM({ 
  baseURL: process.env.LOCAL_LLM_URL!,
  timeout: 60000,        // 60 second timeout for local models
  maxRetries: 2          // Built-in retry configuration
});

for await (const chunk of provider.streamChat({
  model: "llama2:7b",
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
  model: "llama2:7b",
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
const isValid = provider.validateModel("llama2:7b");
console.log("Model valid:", isValid);

// Get token limits
const maxTokens = provider.getMaxTokens("llama2:7b");
console.log("Max tokens:", maxTokens);
```

## Parameter Mapping

| TS Interface Field  | Local API Field            |
|---------------------|----------------------------|
| `maxTokens`         | `max_tokens`               |
| `topP`              | `top_p`                    |
| `responseFormat`    | `response_format.type`     |

This provider assumes OpenAI‑compatible APIs. Fields are mapped automatically.

## Middleware Compatibility

| Feature        | Support |
|----------------|---------|
| `withRetry`    | ✅       |
| `withFallback` | ✅       |

## API Reference

### Provider Configuration

```ts
interface LocalLLMOptions {
  baseURL: string;          // Required: Your local LLM endpoint
  apiKey?: string;          // Optional: API key if required by your endpoint
  timeout?: number;         // Optional: Request timeout in milliseconds (default: 30000)
  maxRetries?: number;      // Optional: Built-in retry attempts (default: 2)
  fetch?: typeof fetch;     // Optional: Custom fetch implementation
}
```

### Streaming Chat

```ts
const stream = provider.streamChat({
  model: "llama2:7b",                   // Required: Model to use
  messages: [                            // Required: Conversation history
    { role: "user", content: "Hello" }
  ],
  temperature: 0.7,                      // Optional: Randomness (0.0 to 2.0)
  maxTokens: 1000,                       // Optional: Max tokens to generate
  topP: 0.9,                            // Optional: Nucleus sampling
  frequencyPenalty: 0.1,                // Optional: Repetition penalty
  presencePenalty: 0.1,                 // Optional: Topic penalty
  stop: ["\n", "END"],                  // Optional: Stop sequences
  systemPrompt: "You are helpful"       // Optional: System instructions
});

// Process streaming response
for await (const chunk of stream) {
  if (chunk.done) break;
  process.stdout.write(chunk.delta);
}
```

### Non-Streaming Chat

```ts
const response = await provider.chat({
  model: "llama2:7b",
  messages: [{ role: "user", content: "Hello" }],
  temperature: 0.7,
  maxTokens: 1000,
  responseFormat: "json_object"  // Get structured responses
});

console.log(response.content);
console.log(`Model: ${response.model}`);
console.log(`Finish reason: ${response.finishReason}`);
console.log(`Usage: ${response.usage.totalTokens} tokens`);
```

### Model Management

```ts
// List available models
const models = await provider.getModels();
// Returns: ['llama2:7b', 'codellama:7b', 'mistral:7b', 'gpt-3.5-turbo']

// Validate model ID (always true for local models)
const isValid = provider.validateModel("llama2:7b");     // true
const isInvalid = provider.validateModel("nonexistent"); // true (local models are flexible)

// Get token limits
const maxTokens = provider.getMaxTokens("llama2:7b");        // 4096
const codeTokens = provider.getMaxTokens("codellama:7b");    // 16384
const mistralTokens = provider.getMaxTokens("mistral:7b");   // 8192
```

## Supported Endpoints

| Endpoint | URL | Description |
|----------|-----|-------------|
| **Ollama** | `http://localhost:11434` | Local model serving (default) |
| **LM Studio** | `http://localhost:1234/v1` | Local model management |
| **Custom** | `http://your-endpoint:8000` | Any OpenAI-compatible API |
| **Network** | `http://192.168.1.100:8000` | Remote local servers |

## Supported Models

The Local provider supports any model that exposes an OpenAI-compatible API endpoint. Common local models include:

| Model Family | Context Window | Description |
|--------------|----------------|-------------|
| **Llama** | 4K-8K tokens | Meta's open-source models |
| **CodeLlama** | 16K tokens | Specialized for code generation |
| **Mistral** | 8K tokens | High-performance open models |
| **Qwen** | 32K tokens | Alibaba's large context models |
| **Yi** | 16K tokens | 01.AI's open models |
| **Gemma** | 8K tokens | Google's lightweight models |
| **Phi** | 2K tokens | Microsoft's compact models |

> **Note**: Token limits vary by model and server configuration. The provider automatically detects common model families and sets appropriate limits.

## Error Handling

The provider throws `LocalLLMError` for API-related errors:

```ts
import { LocalLLMError } from "@tetherai/local";

try {
  const response = await provider.chat({
    model: "llama2:7b",
    messages: [{ role: "user", content: "Hello" }]
  });
} catch (error) {
  if (error instanceof LocalLLMError) {
    console.error(`Local LLM Error ${error.status}: ${error.message}`);
    
    switch (error.status) {
      case 404:
        console.error("Model not found - check if it's downloaded");
        break;
      case 503:
        console.error("Service unavailable - check if Ollama/LM Studio is running");
        break;
      case 500:
        console.error("Server error - check local LLM logs");
        break;
      default:
        console.error("Unexpected error");
    }
  }
}
```

### Error Types

- `LocalLLMError` - Base error class with HTTP status and message
- `404` - Model not found
- `503` - Service unavailable
- `500` - Server error
- `400` - Bad request (invalid parameters)

## Middleware

### Retry Middleware

```ts
import { withRetry } from "@tetherai/local";

const retryProvider = withRetry(provider, {
  maxRetries: 3,
  retryDelay: 1000,
  shouldRetry: (error) => error.status >= 500
});

// Use with automatic retries
const response = await retryProvider.chat({
  model: "llama2:7b",
  messages: [{ role: "user", content: "Hello" }]
});
```

### Fallback Middleware

```ts
import { withFallback } from "@tetherai/local";

const fallbackProvider = withFallback(provider, {
  fallbackProvider: cloudProvider,
  shouldFallback: (error) => error.status === 503
});

// Automatically fallback on service unavailability
const response = await fallbackProvider.chat({
  model: "llama2:7b",
  messages: [{ role: "user", content: "Hello" }]
});
```

## Advanced Examples

### Ollama Setup

```ts
import { localLLM } from "@tetherai/local";

// Start Ollama and pull a model
// ollama pull llama2:7b

const provider = localLLM({
  baseURL: "http://localhost:11434",
  timeout: 60000, // Local models can be slower
});

const response = await provider.chat({
  model: "llama2:7b",
  messages: [
    { role: "user", content: "Explain machine learning in simple terms" }
  ],
  temperature: 0.3,
  maxTokens: 2000
});

console.log(response.content);
```

### LM Studio Setup

```ts
const lmStudioProvider = localLLM({
  baseURL: "http://localhost:1234/v1",
  timeout: 60000, // Local models can be slower
});

const stream = lmStudioProvider.streamChat({
  model: "gpt-3.5-turbo",
  messages: [
    { role: "user", content: "Write a Python function to sort a list" }
  ],
  systemPrompt: "You are a helpful coding assistant. Provide working code examples.",
  temperature: 0.3,
  maxTokens: 1500
});

let fullResponse = "";
for await (const chunk of stream) {
  if (chunk.done) break;
  fullResponse += chunk.delta;
  process.stdout.write(chunk.delta);
}

console.log("\n\nFull response:", fullResponse);
```

### Custom Network Endpoint

```ts
const remoteProvider = localLLM({
  baseURL: "http://192.168.1.100:8000",
  timeout: 45000,
  apiKey: "your-api-key" // if required
});

const models = await remoteProvider.getModels();
console.log("Available models:", models);

const response = await remoteProvider.chat({
  model: "custom-model",
  messages: [{ role: "user", content: "Hello from remote server!" }]
});
```

### Error Recovery with Fallback

```ts
import { localLLM } from "@tetherai/local";
import { withFallback } from "@tetherai/local";

const localProvider = localLLM({ baseURL: "http://localhost:11434" });
const cloudProvider = openAI({ apiKey: process.env.OPENAI_API_KEY! });

const fallbackProvider = withFallback(localProvider, {
  fallbackProvider: cloudProvider,
  shouldFallback: (error) => error.status === 503 || error.status >= 500
});

try {
  const response = await fallbackProvider.chat({
    model: "llama2:7b",
    messages: [{ role: "user", content: "Hello" }]
  });
  console.log("Response:", response.content);
} catch (error) {
  console.error("Both providers failed:", error);
}
```

### Custom Fetch Implementation

```ts
const customProvider = localLLM({
  baseURL: "http://localhost:11434",
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

## Setup Guides

### Ollama

1. **Install Ollama**: <https://ollama.ai/>
2. **Pull a model**: `ollama pull llama2:7b`
3. **Start Ollama service**: `ollama serve`
4. **Use the provider**: `baseURL: 'http://localhost:11434'`

### LM Studio

1. **Download LM Studio**: <https://lmstudio.ai/>
2. **Download a model** (GGUF format)
3. **Start local server** in LM Studio
4. **Use the provider**: `baseURL: 'http://localhost:1234/v1'`

### Custom Endpoints

Any OpenAI-compatible API endpoint will work:

```ts
const customProvider = localLLM({
  baseURL: "http://your-custom-endpoint:8000",
  apiKey: "your-api-key", // if required
  timeout: 30000
});
```

## TypeScript

Full TypeScript support with zero `any` types:

```ts
import { 
  localLLM, 
  LocalLLMOptions, 
  LocalLLMError, 
  ChatResponse,
  StreamChatOptions 
} from "@tetherai/local";

const options: LocalLLMOptions = {
  baseURL: "http://localhost:11434",
  timeout: 30000
};

const provider = localLLM(options);

async function chatWithLocalLLM(options: StreamChatOptions): Promise<ChatResponse> {
  try {
    return await provider.chat(options);
  } catch (error) {
    if (error instanceof LocalLLMError) {
      console.error(`Local LLM error: ${error.message}`);
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
    const provider = localLLM({ 
      baseURL: env.LOCAL_LLM_URL,
      fetch: globalThis.fetch 
    });
    
    const response = await provider.chat({
      model: "llama2:7b",
      messages: [{ role: "user", content: "Hello from Cloudflare!" }]
    });
    
    return new Response(response.content);
  }
};
```

## Performance Tips

- **Local models are slower** than cloud APIs - use appropriate timeouts
- **Memory usage** depends on model size - ensure sufficient RAM
- **GPU acceleration** can significantly improve performance
- **Batch requests** when possible to maximize throughput
- **Use streaming** for real-time responses
- **Set appropriate timeouts** for your use case
- **Implement retry logic** for production reliability
- **Use fallback providers** for high availability

## License

[MIT](https://github.com/nbursa/TetherAI/blob/HEAD/LICENSE)
