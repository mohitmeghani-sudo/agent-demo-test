import { createAgentUIStreamResponse } from "ai";
import { agent } from "@/agent";
import { isAuthorized } from "@/lib/auth";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await request.json();

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  });
}
