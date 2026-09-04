import { defineAgent } from "eve";
import { chatgpt } from "eve/models/openai";

const model =
  process.env.NODE_ENV === "production"
    ? "openai/gpt-5.6-luna"
    : chatgpt("gpt-5.6-luna");

export default defineAgent({
  model,
  reasoning: "xhigh",
  limits: {
    maxOutputTokensPerSession: 20_000,
    sessionTimeoutMs: 24 * 60 * 60 * 1_000,
  },
});
