import { ToolLoopAgent, tool, isStepCount, type InferAgentUIMessage } from "ai";
import { z } from "zod";

const getCurrentTime = tool({
  description: "Get the current date and time in a given IANA timezone",
  inputSchema: z.object({
    timeZone: z
      .string()
      .default("UTC")
      .describe("IANA timezone, e.g. Asia/Kolkata"),
  }),
  execute: async ({ timeZone }) => ({
    timeZone,
    now: new Date().toLocaleString("en-US", { timeZone }),
  }),
});

export const agent = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-5.5",
  instructions: "You are a helpful assistant. Keep answers concise.",
  tools: { getCurrentTime },
  stopWhen: isStepCount(10),
});

export type AgentUIMessage = InferAgentUIMessage<typeof agent>;
