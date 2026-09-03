import { defineAgent } from "eve";
import { chatgpt } from "eve/models/openai";

export default defineAgent({
  model: chatgpt("gpt-5.6-luna"),
  // Eve's generic reasoning setting currently tops out at xhigh. The
  // OpenAI provider option selects Luna's max reasoning mode explicitly.
  reasoning: "xhigh",
  modelOptions: {
    providerOptions: {
      openai: {
        reasoningEffort: "max",
        // Eve's ChatGPT model uses stateless Responses requests. Preserve the
        // opaque reasoning payload so it can be replayed on the next turn.
        include: ["reasoning.encrypted_content"],
      },
    },
  },
  limits: {
    maxOutputTokensPerSession: 20_000,
    sessionTimeoutMs: 24 * 60 * 60 * 1_000,
  },
});
