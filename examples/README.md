# TetherAI Examples

This directory contains demo projects that showcase how to use **TetherAI** providers in different environments.

## Next.js Example

A minimal chat application built with Next.js 14 App Router and Edge runtime.

### Run locally

1. Navigate to the example:

   ```bash
   cd examples/nextjs
   ```

2. Install dependencies:

   ```bash
   pnpm install
   # or: npm install / yarn install
   ```

3. Set your OpenAI API key in environment:

   ```bash
   export OPENAI_API_KEY=sk-...
   ```

   Or create `.env.local` file with:

   ```text
   OPENAI_API_KEY=sk-...
   ```

4. Start the dev server:

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Features

- Streaming responses via **Server-Sent Events (SSE)**
- `withRetry` middleware for transient errors (429, 5xx)
- `withFallback` middleware (prepared for multiple providers)
- Edge runtime compatible

---

Additional examples (Node.js, React hooks) will be added in future iterations.
