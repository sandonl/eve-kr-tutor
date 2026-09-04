import { defineEval } from "eve/evals";

const englishVideoUrl = "https://youtu.be/7GeFt8suV8E";

function rejectsUnverifiedEnglish(value: unknown): boolean {
  if (typeof value !== "object" || value === null || !("status" in value)) {
    return false;
  }

  if (value.status !== "unavailable" || !("reason" in value)) {
    return false;
  }

  return [
    "language_unverified",
    "no_caption_track",
    "blocked",
    "timeout",
    "upstream_error",
  ].includes(String(value.reason));
}

export default defineEval({
  description:
    "An English caption track is never accepted as verified Korean sentence-mining material.",
  tags: ["sentence-mine", "youtube", "network"],
  timeoutMs: 90_000,
  async test(test) {
    await test.send(
      `Call youtube_transcript on exactly this URL: ${englishVideoUrl}. Do not invent a Korean spoken example if the tool reports that Korean captions are unavailable.`,
    );

    test.succeeded();
    test.calledTool("youtube_transcript", {
      input: { videoUrl: englishVideoUrl },
      output: rejectsUnverifiedEnglish,
      count: 1,
    });
  },
});
