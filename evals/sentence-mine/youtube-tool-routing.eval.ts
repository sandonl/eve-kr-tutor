import { defineEval } from "eve/evals";

const videoUrl = "https://www.youtube.com/watch?v=HcSDDe0TD2U";

function isTranscriptResult(value: unknown): boolean {
  if (typeof value !== "object" || value === null || !("status" in value)) {
    return false;
  }

  const status = value.status;
  if (status === "unavailable") {
    return "reason" in value && typeof value.reason === "string";
  }

  if (status !== "ok" || !("segments" in value) || !Array.isArray(value.segments)) {
    return false;
  }

  return value.segments.length > 0;
}

export default defineEval({
  description:
    "Sentence mining loads its skill and routes a supplied YouTube video through the caption extractor.",
  tags: ["sentence-mine", "youtube", "network"],
  timeoutMs: 90_000,
  async test(test) {
    await test.send(
      `Use the sentence-mine skill and call youtube_transcript on exactly this URL: ${videoUrl}. Return one fresh Korean sentence only if the tool provides timestamped captions. Do not use a title, description, or search snippet as spoken-language evidence.`,
    );

    test.succeeded();
    test.loadedSkill("sentence-mine");
    test.calledTool("youtube_transcript", {
      input: { videoUrl },
      output: isTranscriptResult,
      count: 1,
    });
  },
});
