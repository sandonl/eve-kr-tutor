import assert from "node:assert/strict";
import { test } from "node:test";
import type { Options, VideoDetails } from "youtube-caption-extractor";
import {
  createYoutubeTranscriptExecutor,
  type YoutubeTranscriptInput,
} from "../agent/lib/youtube_transcript.js";

const videoUrl = "https://youtu.be/HcSDDe0TD2U?t=10";
const input: YoutubeTranscriptInput = {
  videoUrl,
  language: "ko",
  maxSegments: 300,
};
const signal = new AbortController().signal;

function fakeDetails(
  subtitles: VideoDetails["subtitles"],
): (options: Options) => Promise<VideoDetails> {
  return async () => ({
    title: "한국어 회화 연습",
    description: "fixture",
    subtitles,
  });
}

test("rejects non-YouTube URLs without calling the upstream extractor", async () => {
  let callCount = 0;
  const execute = createYoutubeTranscriptExecutor(async () => {
    callCount += 1;
    return {
      title: "unused",
      description: "unused",
      subtitles: [],
    };
  });

  const result = await execute(
    { ...input, videoUrl: "https://example.com/video" },
    signal,
  );

  assert.equal(result.status, "unavailable");
  assert.equal(result.reason, "invalid_url");
  assert.equal(callCount, 0);
});

test("returns cleaned, timestamped Korean segments and honors the segment limit", async () => {
  let receivedOptions: Options | undefined;
  const execute = createYoutubeTranscriptExecutor(async (options) => {
    receivedOptions = options;
    return {
      title: "한국어 회화 연습",
      description: "fixture",
      subtitles: [
        { start: "0", dur: "1.2", text: "  오늘은 뭐 할 거예요?  " },
        {
          start: "2",
          dur: "1",
          text: " 저는 친구를 만나서 같이 점심을 먹을 거예요. ",
        },
        { start: "bad", dur: "1", text: "이 자막은 건너뜁니다" },
        { start: "5", dur: "NaN", text: "이 자막도 건너뜁니다" },
      ],
    };
  });

  const result = await execute(
    { ...input, maxSegments: 1 },
    signal,
  );

  assert.deepEqual(result, {
    status: "ok",
    videoId: "HcSDDe0TD2U",
    videoUrl: "https://www.youtube.com/watch?v=HcSDDe0TD2U",
    title: "한국어 회화 연습",
    language: "ko",
    languageEvidence: "hangul-dominant",
    segments: [{ start: 0, duration: 1.2, text: "오늘은 뭐 할 거예요?" }],
    truncated: true,
  });
  assert.equal(receivedOptions?.videoID, "HcSDDe0TD2U");
  assert.equal(receivedOptions?.lang, "ko");
  assert.equal(typeof receivedOptions?.fetch, "function");
});

test("does not present an English caption track as Korean", async () => {
  const execute = createYoutubeTranscriptExecutor(
    fakeDetails([
      {
        start: "0",
        dur: "1",
        text: "This is an English sentence with enough letters to be checked.",
      },
    ]),
  );

  const result = await execute(input, signal);

  assert.equal(result.status, "unavailable");
  assert.equal(result.reason, "language_unverified");
});

test("reports missing captions as an explicit unavailable result", async () => {
  const execute = createYoutubeTranscriptExecutor(fakeDetails([]));
  const result = await execute(input, signal);

  assert.equal(result.status, "unavailable");
  assert.equal(result.reason, "no_caption_track");
});

test("reports upstream blocking as an explicit unavailable result", async () => {
  const execute = createYoutubeTranscriptExecutor(async () => {
    throw new Error("HTTP 403: Sign in to confirm you're not a bot");
  });
  const result = await execute(input, signal);

  assert.equal(result.status, "unavailable");
  assert.equal(result.reason, "blocked");
});
