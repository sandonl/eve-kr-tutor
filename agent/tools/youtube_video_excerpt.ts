import { defineTool } from "eve/tools";
import {
  createYoutubeVideoExcerptExecutor,
  type YoutubeVideoExcerptResult,
  youtubeVideoExcerptInputSchema,
  youtubeVideoExcerptOutputSchema,
} from "../lib/youtube_video_excerpt.js";

const executeYoutubeVideoExcerpt = createYoutubeVideoExcerptExecutor();

export default defineTool({
  description:
    "Inspect a public YouTube video and return a short contextual excerpt of consecutive Korean on-screen caption lines with approximate timestamps. Use this only after web_search finds a candidate from the learner's preferred sources. This is Gemini video analysis, not verified caption extraction or audio transcription; return unavailable when visible Korean captions cannot be identified.",
  inputSchema: youtubeVideoExcerptInputSchema,
  outputSchema: youtubeVideoExcerptOutputSchema,
  async execute(input, ctx): Promise<YoutubeVideoExcerptResult> {
    return executeYoutubeVideoExcerpt(input, ctx.abortSignal);
  },
});
