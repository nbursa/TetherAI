# @tetherai/[PROVIDER_NAME]

[PROVIDER_NAME] provider for TetherAI - **completely standalone** with streaming-first API and built-in middleware.

## Installation

```bash
npm install @tetherai/[PROVIDER_NAME]
# or
yarn add @tetherai/[PROVIDER_NAME]
# or
pnpm add @tetherai/[PROVIDER_NAME]
```

**No other dependencies required!**

## Quick Start

```typescript
import { [PROVIDER_FUNCTION], type ChatRequest } from "@tetherai/[PROVIDER_NAME]";

// Create provider
const provider = [PROVIDER_FUNCTION]({
  apiKey: process.env.[PROVIDER_UPPER]_API_KEY!,
});

// Use it
const request: ChatRequest = {
  model: "[MODEL_NAME]",
  messages: [
    { role: "user", content: "Hello!" }
  ],
};

for await (const chunk of provider.streamChat(request)) {
  if (chunk.delta) {
    process.stdout.write(chunk.delta);
  }
}
```

## What's Included

- **Core Types**: `ChatRequest`, `ChatMessage`, `Provider`, etc.  
- **[PROVIDER_NAME] Implementation**: Streaming chat completion  
- **SSE Utilities**: Server-Sent Events handling  
- **Middleware**: Retry and fallback functionality  
- **Error Handling**: [PROVIDER_NAME]-specific error types  

## Middleware Usage

```typescript
import { [PROVIDER_FUNCTION], withRetry, withFallback } from "@tetherai/[PROVIDER_NAME]";

const baseProvider = [PROVIDER_FUNCTION]({ 
  apiKey: process.env.[PROVIDER_UPPER]_API_KEY! 
});

// Add retry logic
const resilientProvider = withRetry(baseProvider, {
  retries: 3,
  baseMs: 500,
});

// Add fallback logic
const fallbackProvider = withFallback([
  [PROVIDER_FUNCTION]({ apiKey: process.env.[PROVIDER_UPPER]_API_KEY! }),
  [PROVIDER_FUNCTION]({ apiKey: process.env.[PROVIDER_UPPER]_API_KEY_2! }),
]);
```

## Configuration Options

```typescript
const provider = [PROVIDER_FUNCTION]({
  apiKey: "your-api-key",
  baseURL: "https://api.[PROVIDER].com/v1", // optional
  timeout: 30000, // optional, default: 30000ms
  maxRetries: 3, // optional, default: 3
  fetch: customFetch, // optional, custom fetch implementation
});
```

## Environment Variables

```bash
[PROVIDER_UPPER]_API_KEY=your-api-key
[PROVIDER_UPPER]_BASE_URL=https://api.[PROVIDER].com/v1
[PROVIDER_UPPER]_TIMEOUT=30000
[PROVIDER_UPPER]_MAX_RETRIES=3
```

## Why Standalone?

- **Faster Installation**: No extra dependencies
- **Smaller Bundle**: Only what you need
- **Easier Maintenance**: Self-contained package
- **Focused**: [PROVIDER_NAME]-specific functionality only

## Examples

See the examples directory for complete working examples.

## License

MIT
