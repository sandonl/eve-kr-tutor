import { defineMcpClientConnection } from "eve/connections";

const requireSupermemoryApiKey = (): string => {
  const apiKey = process.env.SUPERMEMORY_API_KEY;

  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new Error(
      "SUPERMEMORY_API_KEY is required. Copy .env.example to .env and add your Supermemory API key.",
    );
  }

  return apiKey;
};

const getProjectHeaders = (): Record<string, string> => {
  const projectId = process.env.SUPERMEMORY_PROJECT_ID;

  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return {};
  }

  return { "x-sm-project": projectId };
};

export default defineMcpClientConnection({
  url: "https://mcp.supermemory.ai/mcp",
  description:
    "The learner's long-term Korean study memory. Recall vocabulary and expressions already covered so they are not taught again as new; also track goals, preferences, recurring mistakes, and mastered material.",
  auth: {
    getToken: async () => ({ token: requireSupermemoryApiKey() }),
  },
  headers: getProjectHeaders,
  tools: { allow: ["search_memory", "add_memory", "whoAmI"] },
  approval: ({ toolName }) =>
    toolName.endsWith("__add_memory") ? "user-approval" : "not-applicable",
});
