import { defineAgent } from "eve";

const isProduction = process.env.NODE_ENV === "production";

export default defineAgent({
  // Local development uses AI Gateway so Gemini can call the authored
  // caption-only tools. Keep the deployed tutor on its existing model until
  // the local experiment proves useful.
  model: isProduction ? "openai/gpt-5.6-luna" : "google/gemini-3.5-flash",
  // Eve exposes provider-supported reasoning levels; Gemini does not support
  // OpenAI's xhigh setting.
  reasoning: isProduction ? "xhigh" : "medium",
  limits: {
    maxOutputTokensPerSession: 20_000,
    sessionTimeoutMs: 24 * 60 * 60 * 1_000,
  },
});
