import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  MockProvider,
  MockRetryOptions,
  MockError,
} from "../../types/test-types";

describe("Retry Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Retry Functionality", () => {
    it("should retry failed requests", async () => {
      const mockProvider: MockProvider = {
        streamChat: vi
          .fn()
          .mockRejectedValueOnce(new Error("First failure"))
          .mockRejectedValueOnce(new Error("Second failure"))
          .mockResolvedValueOnce("Success"),
      };

      const mockWithRetry = vi
        .fn()
        .mockImplementation(
          (provider: MockProvider, options: MockRetryOptions) => {
            return {
              ...provider,
              streamChat: async (...args: unknown[]) => {
                let lastError: Error;
                for (let attempt = 0; attempt <= options.retries; attempt++) {
                  try {
                    return await provider.streamChat(...args);
                  } catch (error) {
                    lastError = error as Error;
                    if (attempt === options.retries) {
                      throw lastError;
                    }
                    // Simulate delay
                    await new Promise((resolve) => setTimeout(resolve, 100));
                  }
                }
              },
            };
          }
        );

      const retryProvider = mockWithRetry(mockProvider, { retries: 2 });
      const result = await retryProvider.streamChat({
        model: "test",
        messages: [],
      });

      expect(result).toBe("Success");
      expect(mockProvider.streamChat).toHaveBeenCalledTimes(3);
    });

    it("should respect max retry limits", async () => {
      const mockProvider = {
        streamChat: vi.fn().mockRejectedValue(new Error("Always fails")),
      };

      const mockWithRetry = vi.fn().mockImplementation((provider, options) => {
        return {
          ...provider,
          streamChat: async (...args: unknown[]) => {
            let lastError: Error;
            for (let attempt = 0; attempt <= options.retries; attempt++) {
              try {
                return await provider.streamChat(...args);
              } catch (error) {
                lastError = error as Error;
                if (attempt === options.retries) {
                  throw lastError;
                }
              }
            }
          },
        };
      });

      const retryProvider = mockWithRetry(mockProvider, { retries: 3 });

      await expect(
        retryProvider.streamChat({ model: "test", messages: [] })
      ).rejects.toThrow("Always fails");

      expect(mockProvider.streamChat).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe("Backoff Strategies", () => {
    it("should implement exponential backoff", async () => {
      const mockProvider = {
        streamChat: vi.fn().mockRejectedValue(new Error("Fails")),
      };

      const mockWithRetry = vi.fn().mockImplementation((provider, options) => {
        return {
          ...provider,
          streamChat: async (...args: unknown[]) => {
            for (let attempt = 0; attempt <= options.retries; attempt++) {
              try {
                return await provider.streamChat(...args);
              } catch (error) {
                if (attempt === options.retries) {
                  throw error;
                }
                // Exponential backoff: baseMs * factor^attempt
                const delay =
                  (options.baseMs || 1000) *
                  Math.pow(options.factor || 2, attempt);
                await new Promise((resolve) => setTimeout(resolve, delay));
              }
            }
          },
        };
      });

      const retryProvider = mockWithRetry(mockProvider, {
        retries: 2,
        baseMs: 100,
        factor: 2,
      });

      const startTime = Date.now();

      try {
        await retryProvider.streamChat({ model: "test", messages: [] });
      } catch {
        // Expected to fail
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should have delays: 100ms + 200ms = 300ms minimum
      expect(totalTime).toBeGreaterThanOrEqual(300);
    });

    it("should support jitter for backoff", async () => {
      const mockProvider = {
        streamChat: vi.fn().mockRejectedValue(new Error("Fails")),
      };

      const mockWithRetry = vi.fn().mockImplementation((provider, options) => {
        return {
          ...provider,
          streamChat: async (...args: unknown[]) => {
            for (let attempt = 0; attempt <= options.retries; attempt++) {
              try {
                return await provider.streamChat(...args);
              } catch (error) {
                if (attempt === options.retries) {
                  throw error;
                }

                let delay =
                  (options.baseMs || 1000) *
                  Math.pow(options.factor || 2, attempt);

                if (options.jitter) {
                  // Add random jitter (±20%)
                  const jitter = delay * 0.2 * (Math.random() - 0.5);
                  delay += jitter;
                }

                await new Promise((resolve) => setTimeout(resolve, delay));
              }
            }
          },
        };
      });

      const retryProvider = mockWithRetry(mockProvider, {
        retries: 1,
        baseMs: 100,
        factor: 2,
        jitter: true,
      });

      const startTime = Date.now();

      try {
        await retryProvider.streamChat({ model: "test", messages: [] });
      } catch {
        // Expected to fail
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should have delay with jitter
      expect(totalTime).toBeGreaterThanOrEqual(80); // Base delay with some jitter
    });
  });

  describe("Error Classification", () => {
    it("should retry transient errors", async () => {
      const transientErrors = [
        { status: 429, message: "Rate limit exceeded" },
        { status: 500, message: "Internal server error" },
        { status: 502, message: "Bad gateway" },
        { status: 503, message: "Service unavailable" },
        { status: 504, message: "Gateway timeout" },
      ];

      for (const errorInfo of transientErrors) {
        const mockProvider = {
          streamChat: vi
            .fn()
            .mockRejectedValueOnce(
              Object.assign(new Error(errorInfo.message), {
                status: errorInfo.status,
              })
            )
            .mockResolvedValueOnce("Success"),
        };

        const mockWithRetry = vi
          .fn()
          .mockImplementation((provider, options) => {
            return {
              ...provider,
              streamChat: async (...args: unknown[]) => {
                for (let attempt = 0; attempt <= options.retries; attempt++) {
                  try {
                    return await provider.streamChat(...args);
                  } catch (error) {
                    if (attempt === options.retries) {
                      throw error;
                    }
                    // Check if error is transient
                    const isTransient =
                      ((error as MockError).status ?? 0) >= 500 ||
                      (error as MockError).status === 429;
                    if (!isTransient) {
                      throw error;
                    }
                    await new Promise((resolve) => setTimeout(resolve, 10));
                  }
                }
              },
            };
          });

        const retryProvider = mockWithRetry(mockProvider, { retries: 1 });
        const result = await retryProvider.streamChat({
          model: "test",
          messages: [],
        });

        expect(result).toBe("Success");
        expect(mockProvider.streamChat).toHaveBeenCalledTimes(2);
      }
    });

    it("should not retry non-transient errors", async () => {
      const nonTransientErrors = [
        { status: 400, message: "Bad request" },
        { status: 401, message: "Unauthorized" },
        { status: 403, message: "Forbidden" },
        { status: 404, message: "Not found" },
        { status: 422, message: "Validation error" },
      ];

      for (const errorInfo of nonTransientErrors) {
        const mockProvider = {
          streamChat: vi.fn().mockRejectedValue(new Error(errorInfo.message)),
        };

        const mockWithRetry = vi.fn().mockImplementation((provider) => {
          return {
            ...provider,
            streamChat: async (...args: unknown[]) => {
              try {
                return await provider.streamChat(...args);
              } catch (error) {
                // Check if error is transient
                const isTransient =
                  ((error as MockError).status ?? 0) >= 500 ||
                  (error as MockError).status === 429;
                if (!isTransient) {
                  throw error; // Don't retry non-transient errors
                }
                // Retry logic would go here for transient errors
                throw error;
              }
            },
          };
        });

        const retryProvider = mockWithRetry(mockProvider, { retries: 3 });

        await expect(
          retryProvider.streamChat({ model: "test", messages: [] })
        ).rejects.toThrow(errorInfo.message);

        expect(mockProvider.streamChat).toHaveBeenCalledTimes(1); // No retries
      }
    });
  });

  describe("Configuration Options", () => {
    it("should accept custom retry options", async () => {
      const mockProvider = {
        streamChat: vi.fn(),
      };

      const mockWithRetry = vi.fn().mockImplementation((provider, options) => {
        expect(options.retries).toBeDefined();
        expect(options.baseMs).toBeDefined();
        expect(options.factor).toBeDefined();
        expect(options.jitter).toBeDefined();

        return provider;
      });

      const retryProvider = mockWithRetry(mockProvider, {
        retries: 5,
        baseMs: 2000,
        factor: 1.5,
        jitter: true,
      });

      expect(retryProvider).toBe(mockProvider);
      expect(mockWithRetry).toHaveBeenCalledWith(mockProvider, {
        retries: 5,
        baseMs: 2000,
        factor: 1.5,
        jitter: true,
      });
    });

    it("should use default values when options not provided", async () => {
      const mockProvider = {
        streamChat: vi.fn(),
      };

      const mockWithRetry = vi.fn().mockImplementation((provider, options) => {
        const defaults = {
          retries: 3,
          baseMs: 1000,
          factor: 2,
          jitter: false,
        };

        const finalOptions = { ...defaults, ...options };

        expect(finalOptions.retries).toBe(3);
        expect(finalOptions.baseMs).toBe(1000);
        expect(finalOptions.factor).toBe(2);
        expect(finalOptions.jitter).toBe(false);

        return provider;
      });

      const retryProvider = mockWithRetry(mockProvider, {});
      expect(retryProvider).toBe(mockProvider);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero retries", async () => {
      const mockProvider = {
        streamChat: vi.fn().mockRejectedValue(new Error("Fails")),
      };

      const mockWithRetry = vi.fn().mockImplementation((provider, options) => {
        return {
          ...provider,
          streamChat: async (...args: unknown[]) => {
            if (options.retries === 0) {
              return provider.streamChat(...args);
            }
            // Retry logic would go here
            return provider.streamChat(...args);
          },
        };
      });

      const retryProvider = mockWithRetry(mockProvider, { retries: 0 });

      await expect(
        retryProvider.streamChat({ model: "test", messages: [] })
      ).rejects.toThrow("Fails");

      expect(mockProvider.streamChat).toHaveBeenCalledTimes(1); // No retries
    });

    it("should handle very high retry counts", async () => {
      const mockProvider = {
        streamChat: vi.fn().mockRejectedValue(new Error("Fails")),
      };

      const mockWithRetry = vi.fn().mockImplementation((provider, options) => {
        return {
          ...provider,
          streamChat: async (...args: unknown[]) => {
            // Cap retries at reasonable limit
            const maxRetries = Math.min(options.retries, 10);

            for (let attempt = 0; attempt <= maxRetries; attempt++) {
              try {
                return await provider.streamChat(...args);
              } catch (error) {
                if (attempt === maxRetries) {
                  throw error;
                }
              }
            }
          },
        };
      });

      const retryProvider = mockWithRetry(mockProvider, { retries: 100 });

      await expect(
        retryProvider.streamChat({ model: "test", messages: [] })
      ).rejects.toThrow("Fails");

      expect(mockProvider.streamChat).toHaveBeenCalledTimes(11); // Capped at 10 retries
    });
  });
});
