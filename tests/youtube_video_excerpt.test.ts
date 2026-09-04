import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createYoutubeVideoExcerptExecutor,
  type YoutubeVideoExcerptInput,
} from "../agent/lib/youtube_video_excerpt.js";

const videoUrl = "https://youtu.be/HcSDDe0TD2U?t=10";
const input: YoutubeVideoExcerptInput = {
  videoUrl,
};
const signal = new AbortController().signal;

test("does not send non-YouTube URLs to Gemini", async () => {
  let callCount = 0;
  const execute = createYoutubeVideoExcerptExecutor(async () => {
    callCount += 1;
    return { lines: [] };
  });

  const result = await execute(
    { ...input, videoUrl: "https://example.com/video" },
    signal,
  );

  assert.deepEqual(result, {
    status: "unavailable",
    videoUrl: "https://example.com/video",
    reason: "invalid_url",
    detail: "Use a public YouTube watch, short, embed, live, or youtu.be URL.",
  });
  assert.equal(callCount, 0);
});

test("forwards the video request and returns a trimmed, bounded excerpt", async () => {
  let receivedUrl: string | undefined;
  let receivedSignal: AbortSignal | undefined;
  const execute = createYoutubeVideoExcerptExecutor(
    async (requestedUrl, requestedSignal) => {
      receivedUrl = requestedUrl;
      receivedSignal = requestedSignal;
      return {
        lines: [
          { timestamp: " 00:06 ", text: " 여보, 지금 어디야? " },
          { timestamp: "00:10", text: " 나 집이야. 왜? " },
          { timestamp: "00:20", text: "이 줄도 반환됩니다." },
          { timestamp: "00:30", text: "이 줄은 잘립니다." },
        ],
      };
    },
  );

  const result = await execute(input, signal);

  assert.deepEqual(result, {
    status: "ok",
    videoUrl,
    source: "gemini-video-excerpt",
    timestampAccuracy: "approximate",
    lines: [
      { timestamp: "00:06", text: "여보, 지금 어디야?" },
      { timestamp: "00:10", text: "나 집이야. 왜?" },
      { timestamp: "00:20", text: "이 줄도 반환됩니다." },
    ],
  });
  assert.equal(receivedUrl, videoUrl);
  assert.equal(receivedSignal, signal);
});

test("reports when Gemini returns no visible caption text", async () => {
  const execute = createYoutubeVideoExcerptExecutor(async () => ({
    lines: [],
  }));

  const result = await execute(input, signal);

  assert.equal(result.status, "unavailable");
  assert.equal(result.reason, "no_visible_captions");
});

test("does not present non-Korean lines as a Korean excerpt", async () => {
  const execute = createYoutubeVideoExcerptExecutor(async () => ({
    lines: [{ timestamp: "00:06", text: "Where are you going?" }],
  }));

  const result = await execute(input, signal);

  assert.deepEqual(result, {
    status: "unavailable",
    videoUrl,
    reason: "language_unverified",
    detail:
      "Gemini returned on-screen text, but it was not sufficiently Korean to verify for this tutor.",
  });
});
