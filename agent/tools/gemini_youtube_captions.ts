import { defineTool } from "eve/tools";
import {
  createGeminiYoutubeCaptionsExecutor,
  geminiYoutubeCaptionsInputSchema,
  geminiYoutubeCaptionsOutputSchema,
  type GeminiYoutubeCaptionsResult,
} from "../lib/gemini_youtube_captions.js";

const executeGeminiYoutubeCaptions = createGeminiYoutubeCaptionsExecutor();

export default defineTool({
  description:
    "Fetch a short contextual excerpt of consecutive Korean caption or transcript lines from a public YouTube video with Gemini Flash through AI Gateway. This is the agent's only YouTube caption path. Treat the result as a Gemini video transcript with approximate timestamps, not verified original-caption text, and never present it as an exact quote when provenance matters.",
  inputSchema: geminiYoutubeCaptionsInputSchema,
  outputSchema: geminiYoutubeCaptionsOutputSchema,
  async execute(input, ctx): Promise<GeminiYoutubeCaptionsResult> {
    return executeGeminiYoutubeCaptions(input, ctx.abortSignal);
  },
});
