"use client";

import { useChat } from "@ai-sdk/react";
import Link from "next/link";
import { useState } from "react";
import type { AgentUIMessage } from "@/agent";

export default function Home() {
  const [input, setInput] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const { messages, sendMessage, status, error } = useChat<AgentUIMessage>();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-4">
          <h1 className="text-xl font-semibold">Meta Ads Agent</h1>
          <Link href="/dashboard" className="text-sm underline">
            Live ads dashboard
          </Link>
        </div>
        <input
          type="password"
          className="w-40 rounded border border-zinc-300 p-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="Access code"
          value={accessCode}
          onChange={(e) => setAccessCode(e.currentTarget.value)}
        />
      </div>

      <div className="flex flex-1 flex-col gap-4 pb-28">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500">
            Try: &quot;List my ad accounts&quot; or &quot;How did my campaigns
            perform over the last 7 days?&quot;
          </p>
        )}
        {messages.map((message) => (
          <div key={message.id} className="whitespace-pre-wrap">
            <div className="text-xs uppercase text-zinc-500">{message.role}</div>
            {message.parts.map((part, i) => {
              const key = `${message.id}-${i}`;
              if (part.type === "text") return <div key={key}>{part.text}</div>;
              if (part.type.startsWith("tool-")) {
                return (
                  <details key={key} className="mt-1 text-xs text-zinc-500">
                    <summary className="cursor-pointer">
                      {part.type.replace("tool-", "")} call
                    </summary>
                    <pre className="mt-1 max-h-64 overflow-auto rounded bg-zinc-100 p-2 dark:bg-zinc-900">
                      {JSON.stringify(part, null, 2)}
                    </pre>
                  </details>
                );
              }
              return null;
            })}
          </div>
        ))}
        {error && (
          <p className="text-sm text-red-600">
            {error.message.includes("Unauthorized")
              ? "Wrong or missing access code."
              : error.message}
          </p>
        )}
      </div>

      <form
        className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-3xl bg-white px-4 pb-6 pt-2 dark:bg-black"
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          sendMessage(
            { text: input },
            { headers: { "x-access-code": accessCode } },
          );
          setInput("");
        }}
      >
        <input
          className="w-full rounded border border-zinc-300 p-2 dark:border-zinc-700 dark:bg-zinc-900"
          value={input}
          disabled={status === "streaming" || status === "submitted"}
          placeholder="Ask about your Meta ads..."
          onChange={(e) => setInput(e.currentTarget.value)}
        />
      </form>
    </main>
  );
}
