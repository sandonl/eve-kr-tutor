import { defineMcpClientConnection } from "eve/connections";

const requireSupermemoryApiKey = (): string => {
  const apiKey = process.env.SUPERMEMORY_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "SUPERMEMORY_API_KEY is required. Set it in .env.local for local development or in the deployment environment.",
    );
  }

  return apiKey;
};

const getProjectHeaders = (): Record<string, string> => {
  const projectId = process.env.SUPERMEMORY_PROJECT_ID?.trim();

  if (!projectId) {
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
