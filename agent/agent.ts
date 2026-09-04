import { defineAgent } from "eve";
import { tutorModel } from "./model.js";

export default defineAgent({
  model: tutorModel,
  reasoning: "medium",
  limits: {
    maxOutputTokensPerSession: 20_000,
    sessionTimeoutMs: 24 * 60 * 60 * 1_000,
  },
});
