import { defineAgent } from "eve";
import { chatgpt } from "eve/models/openai";

export default defineAgent({
  model: chatgpt("gpt-5.6-luna"),
  reasoning: "xhigh",
  limits: {
    maxOutputTokensPerSession: 20_000,
    sessionTimeoutMs: 24 * 60 * 60 * 1_000,
  },
});
