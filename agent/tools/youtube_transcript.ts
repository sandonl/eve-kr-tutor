import { defineTool } from "eve/tools";
import {
  createYoutubeTranscriptExecutor,
  youtubeTranscriptInputSchema,
  youtubeTranscriptOutputSchema,
  type YoutubeTranscriptResult,
} from "../lib/youtube_transcript.js";

const executeYoutubeTranscript = createYoutubeTranscriptExecutor();

export default defineTool({
  description:
    "Fetch Korean YouTube caption text (not an audio transcription) with timestamps. Use this for spoken sentence mining. It returns unavailable instead of guessing when the video has no accessible captions, the captions are not Korean, or YouTube blocks the request. A Naver article may be used as a separate written sentence-mining alternative, but must never be presented as spoken dialogue.",
  inputSchema: youtubeTranscriptInputSchema,
  outputSchema: youtubeTranscriptOutputSchema,
  async execute(input, ctx): Promise<YoutubeTranscriptResult> {
    return executeYoutubeTranscript(input, ctx.abortSignal);
  },
});
