import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createGeminiYoutubeCaptionsExecutor,
  type GeminiYoutubeCaptionsInput,
} from "../agent/lib/gemini_youtube_captions.js";

const videoUrl = "https://youtu.be/HcSDDe0TD2U?t=10";
const input: GeminiYoutubeCaptionsInput = {
  videoUrl,
};
const signal = new AbortController().signal;

test("does not send non-YouTube URLs to Gemini", async () => {
  let callCount = 0;
  const execute = createGeminiYoutubeCaptionsExecutor(async () => {
    callCount += 1;
    return { captions: [] };
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

test("forwards the video request and returns trimmed, bounded captions", async () => {
  let receivedUrl: string | undefined;
  let receivedSignal: AbortSignal | undefined;
  const execute = createGeminiYoutubeCaptionsExecutor(
    async (requestedUrl, requestedSignal) => {
      receivedUrl = requestedUrl;
      receivedSignal = requestedSignal;
      return {
        captions: [
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
    source: "gemini-video-transcript",
    timestampAccuracy: "approximate",
    captions: [
      { timestamp: "00:06", text: "여보, 지금 어디야?" },
      { timestamp: "00:10", text: "나 집이야. 왜?" },
      { timestamp: "00:20", text: "이 줄도 반환됩니다." },
    ],
  });
  assert.equal(receivedUrl, videoUrl);
  assert.equal(receivedSignal, signal);
});

test("reports when Gemini returns no usable caption text", async () => {
  const execute = createGeminiYoutubeCaptionsExecutor(async () => ({
    captions: [],
  }));

  const result = await execute(input, signal);

  assert.equal(result.status, "unavailable");
  assert.equal(result.reason, "no_caption_text");
});

test("does not present non-Korean lines as Korean captions", async () => {
  const execute = createGeminiYoutubeCaptionsExecutor(async () => ({
    captions: [{ timestamp: "00:06", text: "Where are you going?" }],
  }));

  const result = await execute(input, signal);

  assert.deepEqual(result, {
    status: "unavailable",
    videoUrl,
    reason: "language_unverified",
    detail:
      "Gemini returned caption text, but it was not sufficiently Korean to verify for this tutor.",
  });
});
