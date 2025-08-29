// Shared SSE utilities for all TetherAI providers
// This file gets copied into each provider package during build

// Minimal SSE to AsyncIterable utility
// Converts a Response body (ReadableStream) into an AsyncIterable of `data:` payload strings.
export async function* sseToIterable(res: Response): AsyncIterable<string> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Normalize line endings and split into SSE events by double newline
    const parts = buffer.split(/\r?\n\r?\n/);
    // Process complete chunks; keep the last partial in buffer
    for (let i = 0; i < parts.length - 1; i++) {
      const chunk = parts[i];
      const lines = chunk.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trimStart();
        if (trimmed.startsWith("data:")) {
          yield trimmed.slice(5).trim();
        }
      }
    }
    buffer = parts[parts.length - 1];
  }

  // Flush any remaining complete line without trailing delimiter
  const trailing = buffer.trim();
  if (trailing.length) {
    const lines = trailing.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trimStart();
      if (trimmed.startsWith("data:")) {
        yield trimmed.slice(5).trim();
      }
    }
  }
}
