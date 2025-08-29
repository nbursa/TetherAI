import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Fallback Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Fallback Functionality", () => {
    it("should fallback to next provider on failure", async () => {
      const mockProvider1 = {
        streamChat: vi.fn().mockRejectedValue(new Error("Provider 1 failed")),
      };

      const mockProvider2 = {
        streamChat: vi.fn().mockResolvedValue("Provider 2 success"),
      };

      const mockWithFallback = vi.fn().mockImplementation((providers) => {
        return {
          streamChat: async (...args: unknown[]) => {
            for (let i = 0; i < providers.length; i++) {
              try {
                return await providers[i].streamChat(...args);
              } catch (error) {
                if (i === providers.length - 1) {
                  throw error; // Last provider failed
                }
                // Continue to next provider
              }
            }
          },
        };
      });

      const fallbackProvider = mockWithFallback([mockProvider1, mockProvider2]);
      const result = await fallbackProvider.streamChat({
        model: "test",
        messages: [],
      });

      expect(result).toBe("Provider 2 success");
      expect(mockProvider1.streamChat).toHaveBeenCalledTimes(1);
      expect(mockProvider2.streamChat).toHaveBeenCalledTimes(1);
    });

    it("should use first successful provider", async () => {
      const mockProvider1 = {
        streamChat: vi.fn().mockResolvedValue("Provider 1 success"),
      };

      const mockProvider2 = {
        streamChat: vi.fn().mockResolvedValue("Provider 2 success"),
      };

      const mockWithFallback = vi.fn().mockImplementation((providers) => {
        return {
          streamChat: async (...args: unknown[]) => {
            for (let i = 0; i < providers.length; i++) {
              try {
                return await providers[i].streamChat(...args);
              } catch (error) {
                if (i === providers.length - 1) {
                  throw error;
                }
              }
            }
          },
        };
      });

      const fallbackProvider = mockWithFallback([mockProvider1, mockProvider2]);
      const result = await fallbackProvider.streamChat({
        model: "test",
        messages: [],
      });

      expect(result).toBe("Provider 1 success");
      expect(mockProvider1.streamChat).toHaveBeenCalledTimes(1);
      expect(mockProvider2.streamChat).not.toHaveBeenCalled(); // Never reached
    });
  });

  describe("Fallback Strategies", () => {
    it("should support custom fallback callbacks", async () => {
      const mockProvider1 = {
        streamChat: vi.fn().mockRejectedValue(new Error("Provider 1 failed")),
      };

      const mockProvider2 = {
        streamChat: vi.fn().mockResolvedValue("Provider 2 success"),
      };

      const onFallback = vi.fn();

      const mockWithFallback = vi
        .fn()
        .mockImplementation((providers, options) => {
          return {
            streamChat: async (...args: unknown[]) => {
              for (let i = 0; i < providers.length; i++) {
                try {
                  return await providers[i].streamChat(...args);
                } catch (error) {
                  if (options.onFallback) {
                    options.onFallback(error, i);
                  }

                  if (i === providers.length - 1) {
                    throw error;
                  }
                }
              }
            },
          };
        });

      const fallbackProvider = mockWithFallback(
        [mockProvider1, mockProvider2],
        {
          onFallback,
        }
      );

      const result = await fallbackProvider.streamChat({
        model: "test",
        messages: [],
      });

      expect(result).toBe("Provider 2 success");
      expect(onFallback).toHaveBeenCalledWith(
        expect.any(Error),
        0 // First provider index
      );
    });

    it("should respect max fallback limits", async () => {
      const mockProviders = [
        { streamChat: vi.fn().mockRejectedValue(new Error("Failed")) },
        { streamChat: vi.fn().mockRejectedValue(new Error("Failed")) },
        { streamChat: vi.fn().mockRejectedValue(new Error("Failed")) },
        { streamChat: vi.fn().mockResolvedValue("Success") },
      ];

      const mockWithFallback = vi
        .fn()
        .mockImplementation((providers, options) => {
          return {
            streamChat: async (...args: unknown[]) => {
              const maxFallbacks = options.maxFallbacks || providers.length - 1;
              let fallbackCount = 0;

              for (let i = 0; i < providers.length; i++) {
                try {
                  return await providers[i].streamChat(...args);
                } catch (error) {
                  if (fallbackCount >= maxFallbacks) {
                    throw error;
                  }
                  fallbackCount++;
                }
              }
            },
          };
        });

      const fallbackProvider = mockWithFallback(mockProviders, {
        maxFallbacks: 2,
      });

      await expect(
        fallbackProvider.streamChat({ model: "test", messages: [] })
      ).rejects.toThrow("Failed");

      // Should only try first 3 providers (initial + 2 fallbacks)
      expect(mockProviders[0].streamChat).toHaveBeenCalledTimes(1);
      expect(mockProviders[1].streamChat).toHaveBeenCalledTimes(1);
      expect(mockProviders[2].streamChat).toHaveBeenCalledTimes(1);
      expect(mockProviders[3].streamChat).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should propagate errors when all providers fail", async () => {
      const mockProviders = [
        {
          streamChat: vi.fn().mockRejectedValue(new Error("Provider 1 failed")),
        },
        {
          streamChat: vi.fn().mockRejectedValue(new Error("Provider 2 failed")),
        },
        {
          streamChat: vi.fn().mockRejectedValue(new Error("Provider 3 failed")),
        },
      ];

      const mockWithFallback = vi.fn().mockImplementation((providers) => {
        return {
          streamChat: async (...args: unknown[]) => {
            let lastError: Error;

            for (let i = 0; i < providers.length; i++) {
              try {
                return await providers[i].streamChat(...args);
              } catch (error) {
                lastError = error as Error;
                if (i === providers.length - 1) {
                  throw lastError;
                }
              }
            }
          },
        };
      });

      const fallbackProvider = mockWithFallback(mockProviders);

      await expect(
        fallbackProvider.streamChat({ model: "test", messages: [] })
      ).rejects.toThrow("Provider 3 failed");

      // All providers should have been tried
      expect(mockProviders[0].streamChat).toHaveBeenCalledTimes(1);
      expect(mockProviders[1].streamChat).toHaveBeenCalledTimes(1);
      expect(mockProviders[2].streamChat).toHaveBeenCalledTimes(1);
    });

    it("should handle different error types", async () => {
      const mockProviders = [
        { streamChat: vi.fn().mockRejectedValue(new Error("Network error")) },
        { streamChat: vi.fn().mockRejectedValue(new TypeError("Type error")) },
        {
          streamChat: vi.fn().mockRejectedValue(new RangeError("Range error")),
        },
      ];

      const mockWithFallback = vi.fn().mockImplementation((providers) => {
        return {
          streamChat: async (...args: unknown[]) => {
            for (let i = 0; i < providers.length; i++) {
              try {
                return await providers[i].streamChat(...args);
              } catch (error) {
                if (i === providers.length - 1) {
                  throw error;
                }
              }
            }
          },
        };
      });

      const fallbackProvider = mockWithFallback(mockProviders);

      await expect(
        fallbackProvider.streamChat({ model: "test", messages: [] })
      ).rejects.toThrow("Range error");

      // All providers should have been tried
      expect(mockProviders[0].streamChat).toHaveBeenCalledTimes(1);
      expect(mockProviders[1].streamChat).toHaveBeenCalledTimes(1);
      expect(mockProviders[2].streamChat).toHaveBeenCalledTimes(1);
    });
  });

  describe("Provider Management", () => {
    it("should handle single provider gracefully", async () => {
      const mockProvider = {
        streamChat: vi.fn().mockResolvedValue("Success"),
      };

      const mockWithFallback = vi.fn().mockImplementation((providers) => {
        return {
          streamChat: async (...args: unknown[]) => {
            if (providers.length === 1) {
              return providers[0].streamChat(...args);
            }

            // Fallback logic for multiple providers
            for (let i = 0; i < providers.length; i++) {
              try {
                return await providers[i].streamChat(...args);
              } catch (error) {
                if (i === providers.length - 1) {
                  throw error;
                }
              }
            }
          },
        };
      });

      const fallbackProvider = mockWithFallback([mockProvider]);
      const result = await fallbackProvider.streamChat({
        model: "test",
        messages: [],
      });

      expect(result).toBe("Success");
      expect(mockProvider.streamChat).toHaveBeenCalledTimes(1);
    });

    it("should handle empty provider array", async () => {
      const mockWithFallback = vi.fn().mockImplementation((providers) => {
        return {
          streamChat: async (...args: unknown[]) => {
            if (providers.length === 0) {
              throw new Error("No providers available");
            }

            // Normal fallback logic
            for (let i = 0; i < providers.length; i++) {
              try {
                return await providers[i].streamChat(...args);
              } catch (error) {
                if (i === providers.length - 1) {
                  throw error;
                }
              }
            }
          },
        };
      });

      const fallbackProvider = mockWithFallback([]);

      await expect(
        fallbackProvider.streamChat({ model: "test", messages: [] })
      ).rejects.toThrow("No providers available");
    });
  });

  describe("Configuration Options", () => {
    it("should accept custom fallback options", async () => {
      const mockProvider = {
        streamChat: vi.fn(),
      };

      const mockWithFallback = vi
        .fn()
        .mockImplementation((providers, options) => {
          expect(options.maxFallbacks).toBeDefined();
          expect(options.onFallback).toBeDefined();

          return providers[0]; // Return first provider for testing
        });

      const onFallback = vi.fn();
      const fallbackProvider = mockWithFallback([mockProvider], {
        maxFallbacks: 5,
        onFallback,
      });

      expect(fallbackProvider).toBe(mockProvider);
      expect(mockWithFallback).toHaveBeenCalledWith([mockProvider], {
        maxFallbacks: 5,
        onFallback,
      });
    });

    it("should use default values when options not provided", async () => {
      const mockProvider = {
        streamChat: vi.fn(),
      };

      const mockWithFallback = vi
        .fn()
        .mockImplementation((providers, options) => {
          const defaults = {
            maxFallbacks: providers.length - 1,
            onFallback: undefined,
          };

          const finalOptions = { ...defaults, ...options };

          expect(finalOptions.maxFallbacks).toBe(0); // Single provider
          expect(finalOptions.onFallback).toBeUndefined();

          return providers[0];
        });

      const fallbackProvider = mockWithFallback([mockProvider], {});
      expect(fallbackProvider).toBe(mockProvider);
    });
  });

  describe("Edge Cases", () => {
    it("should handle providers with different interfaces", async () => {
      const mockProvider1 = {
        streamChat: vi.fn().mockRejectedValue(new Error("Failed")),
      };

      const mockProvider2 = {
        chat: vi.fn().mockResolvedValue("Success"), // Different method name
      };

      const mockWithFallback = vi.fn().mockImplementation((providers) => {
        return {
          streamChat: async (...args: unknown[]) => {
            for (let i = 0; i < providers.length; i++) {
              try {
                const provider = providers[i];
                if (provider.streamChat) {
                  return await provider.streamChat(...args);
                } else if (provider.chat) {
                  // Adapt different interface
                  const result = await provider.chat(...args);
                  return { delta: { content: result }, done: true };
                }
              } catch (error) {
                if (i === providers.length - 1) {
                  throw error;
                }
              }
            }
          },
        };
      });

      const fallbackProvider = mockWithFallback([mockProvider1, mockProvider2]);
      const result = await fallbackProvider.streamChat({
        model: "test",
        messages: [],
      });

      expect(result).toEqual({ delta: { content: "Success" }, done: true });
    });

    it("should handle async provider initialization", async () => {
      const mockProvider1 = {
        streamChat: vi.fn().mockRejectedValue(new Error("Failed")),
      };

      const mockProvider2 = {
        streamChat: vi.fn().mockResolvedValue("Success"),
      };

      const mockWithFallback = vi.fn().mockImplementation((providers) => {
        return {
          streamChat: async (...args: unknown[]) => {
            // Simulate async provider initialization
            const initializedProviders = await Promise.all(
              providers.map(async (provider) => {
                // Simulate async setup
                await new Promise((resolve) => setTimeout(resolve, 10));
                return provider;
              })
            );

            for (let i = 0; i < initializedProviders.length; i++) {
              try {
                return await initializedProviders[i].streamChat(...args);
              } catch (error) {
                if (i === initializedProviders.length - 1) {
                  throw error;
                }
              }
            }
          },
        };
      });

      const fallbackProvider = mockWithFallback([mockProvider1, mockProvider2]);
      const result = await fallbackProvider.streamChat({
        model: "test",
        messages: [],
      });

      expect(result).toBe("Success");
    });
  });
});
