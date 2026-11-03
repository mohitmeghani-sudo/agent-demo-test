import { createAgentUIStreamResponse } from "ai";
import { agent } from "@/agent";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { messages } = await request.json();

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  });
}
