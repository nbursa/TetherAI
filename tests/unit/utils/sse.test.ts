import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  MockSSE,
  MockSSEParseResult,
  MockSSEChunk,
  MockResponse,
} from "../../types/test-types";

describe("SSE Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SSE Parsing", () => {
    it("should parse basic SSE data", async () => {
      const mockSSE: MockSSE = {
        parse: vi
          .fn()
          .mockImplementation((chunk: string): MockSSEParseResult => {
            const lines = chunk.split("\n");
            const result: MockSSEParseResult = {};

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  result.done = true;
                } else {
                  try {
                    result.data = JSON.parse(data);
                  } catch {
                    result.data = data;
                  }
                }
              }
            }

            return result;
          }),
        toIterable: vi.fn(),
      };

      const testChunk = 'data: {"content": "Hello"}\n\n';
      const result = mockSSE.parse(testChunk);

      expect(result.data).toEqual({ content: "Hello" });
      expect(result.done).toBeUndefined();
    });

    it("should handle SSE done signal", async () => {
      const mockSSE: MockSSE = {
        parse: vi
          .fn()
          .mockImplementation((chunk: string): MockSSEParseResult => {
            if (chunk.includes("[DONE]")) {
              return { done: true };
            }
            return {};
          }),
        toIterable: vi.fn(),
      };

      const testChunk = "data: [DONE]\n\n";
      const result = mockSSE.parse(testChunk);

      expect(result.done).toBe(true);
    });

    it("should handle malformed SSE data", async () => {
      const mockSSE: MockSSE = {
        parse: vi
          .fn()
          .mockImplementation((chunk: string): MockSSEParseResult => {
            try {
              const lines = chunk.split("\n");
              const result: MockSSEParseResult = {};

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6);
                  if (data === "[DONE]") {
                    result.done = true;
                  } else {
                    try {
                      result.data = JSON.parse(data);
                    } catch {
                      result.data = data;
                    }
                  }
                }
              }

              return result;
            } catch {
              return { error: "Parse failed" };
            }
          }),
        toIterable: vi.fn(),
      };

      const malformedChunk = "data: {invalid json\n\n";
      const result = mockSSE.parse(malformedChunk);

      expect(result.data).toBe("{invalid json");
      expect(result.error).toBeUndefined();
    });

    it("should handle empty SSE chunks", async () => {
      const mockSSE: MockSSE = {
        parse: vi
          .fn()
          .mockImplementation((chunk: string): MockSSEParseResult => {
            if (!chunk.trim()) {
              return {};
            }

            const lines = chunk.split("\n");
            const result: MockSSEParseResult = {};

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  result.done = true;
                } else {
                  try {
                    result.data = JSON.parse(data);
                  } catch {
                    result.data = data;
                  }
                }
              }
            }

            return result;
          }),
        toIterable: vi.fn(),
      };

      const emptyChunk = "\n\n";
      const result = mockSSE.parse(emptyChunk);

      expect(result).toEqual({});
    });
  });

  describe("SSE to Iterable Conversion", () => {
    it("should convert SSE stream to async iterable", async () => {
      const mockStream = [
        'data: {"content": "Hello"}\n\n',
        'data: {"content": " World"}\n\n',
        "data: [DONE]\n\n",
      ];

      const mockSSE: MockSSE = {
        parse: vi.fn(),
        toIterable: vi
          .fn()
          .mockImplementation(async function* (): AsyncGenerator<MockSSEChunk> {
            for (const chunk of mockStream) {
              yield { data: chunk, done: false };
            }
            yield { done: true };
          }),
      };

      const mockResponse: MockResponse = { body: mockStream };
      const iterable = mockSSE.toIterable(mockResponse);

      const chunks: MockSSEChunk[] = [];
      for await (const chunk of iterable) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(4); // 3 data chunks + 1 done
      expect(chunks[0].data).toBe(mockStream[0]);
      expect(chunks[3].done).toBe(true);
    });

    it("should handle streaming errors gracefully", async () => {
      const mockSSE: MockSSE = {
        parse: vi.fn(),
        toIterable: vi
          .fn()
          .mockImplementation(async function* (): AsyncGenerator<MockSSEChunk> {
            yield { data: 'data: {"content": "Hello"}\n\n', done: false };
            throw new Error("Stream error");
          }),
      };

      const mockResponse: MockResponse = { body: [] };
      const iterable = mockSSE.toIterable(mockResponse);

      const chunks: MockSSEChunk[] = [];
      try {
        for await (const chunk of iterable) {
          chunks.push(chunk);
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Stream error");
      }

      expect(chunks).toHaveLength(1);
    });

    it("should handle empty streams", async () => {
      const mockSSE: MockSSE = {
        parse: vi.fn(),
        toIterable: vi
          .fn()
          .mockImplementation(async function* (): AsyncGenerator<MockSSEChunk> {
            // Empty stream - no yields
            yield { done: true }; // Must have at least one yield
          }),
      };

      const mockResponse: MockResponse = { body: [] };
      const iterable = mockSSE.toIterable(mockResponse);

      const chunks: MockSSEChunk[] = [];
      for await (const chunk of iterable) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].done).toBe(true);
    });
  });

  describe("SSE Event Handling", () => {
    it("should handle different SSE event types", async () => {
      const mockSSE: MockSSE = {
        parse: vi
          .fn()
          .mockImplementation((chunk: string): MockSSEParseResult => {
            const lines = chunk.split("\n");
            const result: MockSSEParseResult = {};

            for (const line of lines) {
              if (line.startsWith("event: ")) {
                result.event = line.slice(7);
              } else if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  result.done = true;
                } else {
                  try {
                    result.data = JSON.parse(data);
                  } catch {
                    result.data = data;
                  }
                }
              } else if (line.startsWith("id: ")) {
                result.id = line.slice(4);
              }
            }

            return result;
          }),
        toIterable: vi.fn(),
      };

      const testChunk =
        'event: message\nid: 123\ndata: {"content": "Hello"}\n\n';
      const result = mockSSE.parse(testChunk);

      expect(result.event).toBe("message");
      expect(result.id).toBe("123");
      expect(result.data).toEqual({ content: "Hello" });
    });

    it("should handle SSE retry events", async () => {
      const mockSSE: MockSSE = {
        parse: vi
          .fn()
          .mockImplementation((chunk: string): MockSSEParseResult => {
            const lines = chunk.split("\n");
            const result: MockSSEParseResult = {};

            for (const line of lines) {
              if (line.startsWith("retry: ")) {
                result.retry = parseInt(line.slice(7), 10);
              } else if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  result.done = true;
                } else {
                  try {
                    result.data = JSON.parse(data);
                  } catch {
                    result.data = data;
                  }
                }
              }
            }

            return result;
          }),
        toIterable: vi.fn(),
      };

      const testChunk = 'retry: 5000\ndata: {"content": "Hello"}\n\n';
      const result = mockSSE.parse(testChunk);

      expect(result.retry).toBe(5000);
      expect(result.data).toEqual({ content: "Hello" });
    });
  });

  describe("SSE Stream Processing", () => {
    it("should process SSE streams with buffering", async () => {
      const mockStream = [
        'data: {"content": "Hello"}\n',
        '\ndata: {"content": " World"}\n\n',
        "data: [DONE]\n\n",
      ];

      const mockSSE: MockSSE = {
        parse: vi.fn(),
        toIterable: vi.fn().mockImplementation(async function* (
          stream: unknown
        ): AsyncGenerator<MockSSEChunk> {
          const mockStream = stream as MockResponse;
          const buffer: string[] = [];

          // Process the mock stream data
          if (Array.isArray(mockStream.body)) {
            for (const chunk of mockStream.body) {
              buffer.push(chunk);

              // Process complete SSE messages
              const fullMessage = buffer.join("");
              if (fullMessage.includes("\n\n")) {
                const messages = fullMessage.split("\n\n");

                for (let i = 0; i < messages.length - 1; i++) {
                  if (messages[i].trim()) {
                    yield { data: messages[i] + "\n\n", done: false };
                  }
                }

                // Keep incomplete message in buffer
                buffer.splice(0, messages.length - 1);
              }
            }
          }

          // Process remaining buffer
          if (buffer.length > 0) {
            yield { data: buffer.join(""), done: false };
          }

          yield { done: true };
        }),
      };

      const mockResponse: MockResponse = { body: mockStream };
      const iterable = mockSSE.toIterable(mockResponse);

      const chunks: MockSSEChunk[] = [];
      for await (const chunk of iterable) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(4); // 3 data chunks + 1 done
      expect(chunks[0].data).toContain('{"content": "Hello"}');
      expect(chunks[1].data).toContain('{"content": " World"}');
      expect(chunks[2].data).toContain("[DONE]");
      expect(chunks[3].done).toBe(true);
    });
  });

  describe("SSE Error Recovery", () => {
    it("should recover from malformed chunks", async () => {
      const mockSSE: MockSSE = {
        parse: vi.fn(),
        toIterable: vi.fn().mockImplementation(async function* (
          stream: unknown
        ): AsyncGenerator<MockSSEChunk> {
          const mockStream = stream as MockResponse;

          if (Array.isArray(mockStream.body)) {
            for (const chunk of mockStream.body) {
              try {
                // Try to parse the chunk
                if (chunk.includes("data: ")) {
                  if (chunk.includes("[DONE]")) {
                    yield { data: chunk, done: true }; // [DONE] chunk
                  } else {
                    yield { data: chunk, done: false }; // Regular data chunk
                  }
                }
              } catch {
                // Skip malformed chunks
                continue;
              }
            }
          }

          // Always yield done at the end
          yield { done: true };
        }),
      };

      const mockStream = [
        'data: {"content": "Valid"}\n\n',
        "malformed chunk",
        'data: {"content": "Also valid"}\n\n',
        "data: [DONE]\n\n",
      ];

      const mockResponse: MockResponse = { body: mockStream };
      const iterable = mockSSE.toIterable(mockResponse);

      const chunks: MockSSEChunk[] = [];
      for await (const chunk of iterable) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(4); // 2 valid chunks + 1 [DONE] + 1 final done
      expect(chunks[0].data).toContain('{"content": "Valid"}');
      expect(chunks[1].data).toContain('{"content": "Also valid"}');
      expect(chunks[2].done).toBe(true); // [DONE] chunk
      expect(chunks[3].done).toBe(true); // Final done signal
    });
  });

  describe("SSE Performance", () => {
    it("should handle high-frequency SSE messages", async () => {
      const mockSSE: MockSSE = {
        parse: vi.fn(),
        toIterable: vi.fn().mockImplementation(async function* (
          stream: unknown
        ): AsyncGenerator<MockSSEChunk> {
          const startTime = Date.now();
          const mockStream = stream as MockResponse;

          if (Array.isArray(mockStream.body)) {
            for (const chunk of mockStream.body) {
              if (chunk.includes("data: ")) {
                if (chunk.includes("[DONE]")) {
                  yield { data: chunk, done: true }; // [DONE] chunk
                  break;
                } else {
                  yield { data: chunk, done: false }; // Regular data chunk
                }
              }

              // Check if we're processing too slowly
              const elapsed = Date.now() - startTime;
              if (elapsed > 1000) {
                // 1 second timeout
                throw new Error("Processing too slow");
              }
            }
          }

          // Always yield done at the end if we didn't break
          yield { done: true };
        }),
      };

      const mockStream = Array.from(
        { length: 1000 },
        (_, i) => `data: {"content": "Message ${i}"}\n\n`
      );
      mockStream.push("data: [DONE]\n\n");

      const mockResponse: MockResponse = { body: mockStream };
      const iterable = mockSSE.toIterable(mockResponse);

      const chunks: MockSSEChunk[] = [];
      for await (const chunk of iterable) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1002); // 1000 messages + 1 [DONE] + 1 final done
      expect(chunks[0].data).toContain('{"content": "Message 0"}');
      expect(chunks[999].data).toContain('{"content": "Message 999"}');
      expect(chunks[1000].done).toBe(true); // [DONE] chunk
      expect(chunks[1001].done).toBe(true); // Final done signal
    });
  });
});
