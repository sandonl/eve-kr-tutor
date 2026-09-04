import { defineAgent } from "eve";

export default defineAgent({
  model: "google/gemini-3.5-flash",
  reasoning: "medium",
  limits: {
    maxOutputTokensPerSession: 20_000,
    sessionTimeoutMs: 24 * 60 * 60 * 1_000,
  },
});
