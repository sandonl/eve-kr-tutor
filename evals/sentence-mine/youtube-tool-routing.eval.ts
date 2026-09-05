import { defineEval } from "eve/evals";

const videoUrl = "https://www.youtube.com/watch?v=HcSDDe0TD2U";

function isVideoExcerptResult(value: unknown): boolean {
  if (typeof value !== "object" || value === null || !("status" in value)) {
    return false;
  }

  const status = value.status;
  if (status === "unavailable") {
    return "reason" in value && typeof value.reason === "string";
  }

  if (status !== "ok" || !("lines" in value) || !Array.isArray(value.lines)) {
    return false;
  }

  return value.lines.length > 0;
}

export default defineEval({
  description:
    "Sentence mining loads its skill, routes a supplied YouTube video through the optional video-excerpt tool, and cites the exact source URL.",
  tags: ["sentence-mine", "youtube", "network"],
  timeoutMs: 90_000,
  async test(test) {
    await test.send(
      `Use the sentence-mine skill and call youtube_video_excerpt on exactly this URL: ${videoUrl}. Try to return 3–5 fresh Korean mines when the tool provides enough distinct visible Korean caption lines; return fewer only when the source cannot safely support more. Include the exact URL on a separate 출처 링크: line for every mine. Do not use a title, description, or search snippet as spoken-language evidence.`,
    );

    test.succeeded();
    test.loadedSkill("sentence-mine");
    test.messageIncludes(videoUrl);
    test.messageIncludes("출처 링크:");
    test.eventsSatisfy("no sentence-mining meta preamble", (events) =>
      events.every(
        (event) =>
          event.type !== "message.completed" ||
          typeof event.data.message !== "string" ||
          !/Let's format|^Draft:|Following the constraints|I'll present/i.test(
            event.data.message.trim(),
          ),
      ),
    );
    test.calledTool("youtube_video_excerpt", {
      input: { videoUrl },
      output: isVideoExcerptResult,
      count: 1,
    });
  },
});
