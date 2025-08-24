"use client";

import { useCallback, useRef, useState } from "react";

type UIMessage = { id: string; role: "user" | "assistant"; content: string };

async function* readSSE(res: Response) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (p.startsWith("data:")) {
        const data = p.slice(5).trim();
        if (!data) continue;
        yield JSON.parse(data) as { delta?: string; done?: boolean };
      }
    }
    buffer = parts[parts.length - 1];
  }
}

export default function Page() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async () => {
    if (!input.trim()) return;
    const user: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
    };
    const asst: UIMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };
    setMessages((prev) => [...prev, user, asst]);
    setInput("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: messages.concat(user),
        }),
        signal: controller.signal,
      });

      for await (const ev of readSSE(res)) {
        if (ev.delta) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asst.id ? { ...m, content: m.content + ev.delta } : m
            )
          );
        }
        if (ev.done) break;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStreaming(false);
    }
  }, [input, messages]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "40px auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1>TetherAI – Next.js Chat (MVP)</h1>

      <div
        style={{
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 8,
          minHeight: 240,
        }}
      >
        {messages.map((m) => (
          <p key={m.id}>
            <b>{m.role}:</b> {m.content}
          </p>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something..."
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={send} disabled={streaming}>
          Send
        </button>
        <button onClick={abort} disabled={!streaming}>
          Stop
        </button>
      </div>

      <p style={{ marginTop: 16, fontSize: 12, color: "#666" }}>
        Set <code>OPENAI_API_KEY</code> in your environment. This example uses
        Edge runtime and streams tokens via SSE.
      </p>
    </main>
  );
}
