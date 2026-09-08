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
    "The learner's long-term Korean study memory. Keep one canonical numbered state index headed EVE_KOREAN_LEARNING_PILE for words, expressions, and grammar; each entry has a stable item number, exactly one Unseen/Learning/Seen state, and a compact example or context. The current Learning pile is the subset marked Learning. Migrate an older unnumbered consolidated record once, then replace the complete canonical record whenever state changes and use stable item numbers for review and pagination. Recall state so Learning items get more practice and Seen items are not proactively recommended; remember the learner's saved 2k frequency-list preference as a soft familiarity filter; also track goals, source preferences, recurring mistakes, and broader learning progress.",
  auth: {
    getToken: async () => ({ token: requireSupermemoryApiKey() }),
  },
  headers: getProjectHeaders,
  tools: { allow: ["search_memory", "add_memory", "whoAmI"] },
  approval: ({ toolName }) =>
    toolName.endsWith("__add_memory") ? "approved" : "not-applicable",
});
