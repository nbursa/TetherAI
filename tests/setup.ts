import { beforeAll, afterAll } from "vitest";

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = "test";
  process.env.OPENAI_API_KEY = "sk-test-key";
  process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";

  console.log("🧪 Test environment initialized");
});

afterAll(() => {
  console.log("🧹 Test environment cleaned up");
});

// Global test utilities
export const mockOpenAIResponse = {
  id: "chatcmpl-test",
  object: "chat.completion.chunk",
  created: Date.now(),
  model: "gpt-4o-mini",
  choices: [
    {
      index: 0,
      delta: { content: "Hello from test!" },
      finish_reason: null,
    },
  ],
};

export const mockAnthropicResponse = {
  type: "content_block_delta",
  index: 0,
  delta: {
    type: "text_delta",
    text: "Hello from test!",
  },
};
