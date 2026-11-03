"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import type { AgentUIMessage } from "@/agent";

export default function Home() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat<AgentUIMessage>();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-10">
      <h1 className="mb-6 text-xl font-semibold">Agent</h1>

      <div className="flex flex-1 flex-col gap-4 pb-24">
        {messages.map((message) => (
          <div key={message.id} className="whitespace-pre-wrap">
            <div className="text-xs uppercase text-zinc-500">{message.role}</div>
            {message.parts.map((part, i) => {
              switch (part.type) {
                case "text":
                  return <div key={`${message.id}-${i}`}>{part.text}</div>;
                case "tool-getCurrentTime":
                  return (
                    <pre
                      key={`${message.id}-${i}`}
                      className="mt-1 overflow-x-auto rounded bg-zinc-100 p-2 text-xs dark:bg-zinc-900"
                    >
                      {JSON.stringify(part, null, 2)}
                    </pre>
                  );
                default:
                  return null;
              }
            })}
          </div>
        ))}
      </div>

      <form
        className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-2xl bg-white px-4 pb-6 pt-2 dark:bg-black"
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput("");
        }}
      >
        <input
          className="w-full rounded border border-zinc-300 p-2 dark:border-zinc-700 dark:bg-zinc-900"
          value={input}
          disabled={status === "streaming"}
          placeholder="Say something..."
          onChange={(e) => setInput(e.currentTarget.value)}
        />
      </form>
    </main>
  );
}
