import {
  getVideoDetails,
  type Options as YoutubeDetailsOptions,
  type VideoDetails,
} from "youtube-caption-extractor";
import { z } from "zod";

export const youtubeTranscriptInputSchema = z.object({
  videoUrl: z.string().url().describe("A public YouTube video URL."),
  language: z
    .literal("ko")
    .default("ko")
    .describe("The caption language to retrieve. Korean is required for this agent."),
  maxSegments: z
    .number()
    .int()
    .min(1)
    .max(500)
    .default(300)
    .describe("Maximum number of timestamped segments to return."),
});

const segmentSchema = z.object({
  start: z.number(),
  duration: z.number(),
  text: z.string(),
});

export const youtubeTranscriptOutputSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    videoId: z.string(),
    videoUrl: z.string().url(),
    title: z.string(),
    language: z.literal("ko"),
    languageEvidence: z.literal("hangul-dominant"),
    segments: z.array(segmentSchema),
    truncated: z.boolean(),
  }),
  z.object({
    status: z.literal("unavailable"),
    videoId: z.string().nullable(),
    videoUrl: z.string().url(),
    reason: z.enum([
      "invalid_url",
      "no_caption_track",
      "language_unverified",
      "blocked",
      "timeout",
      "upstream_error",
    ]),
    detail: z.string(),
  }),
]);

export type YoutubeTranscriptInput = z.infer<typeof youtubeTranscriptInputSchema>;
export type YoutubeTranscriptResult = z.infer<
  typeof youtubeTranscriptOutputSchema
>;
export type YoutubeDetailsFetcher = (
  options: YoutubeDetailsOptions,
) => Promise<VideoDetails>;

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const HANGUL_PATTERN = /[\uac00-\ud7a3]/u;
const LETTER_PATTERN = /\p{L}/u;

function getVideoId(videoUrl: string): string | null {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(videoUrl);
  } catch {
    return null;
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  let videoId: string | null = null;

  if (hostname === "youtu.be" || hostname === "www.youtu.be") {
    videoId = parsedUrl.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
    if (parsedUrl.pathname === "/watch") {
      videoId = parsedUrl.searchParams.get("v");
    } else {
      const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "live"].includes(pathParts[0] ?? "")) {
        videoId = pathParts[1] ?? null;
      }
    }
  }

  return videoId && VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
}

function canonicalVideoUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function createTimedFetch(timeoutMs: number, parentSignal: AbortSignal): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const abortFromParent = () => controller.abort(parentSignal.reason);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    if (parentSignal.aborted) {
      abortFromParent();
    } else {
      parentSignal.addEventListener("abort", abortFromParent, { once: true });
    }

    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
      parentSignal.removeEventListener("abort", abortFromParent);
    }
  };
}

function hasKoreanTranscript(text: string): boolean {
  // The upstream library treats `lang` as a hint and may return another
  // track. This content check prevents an English fallback from being
  // presented as Korean; it is not a transcription-confidence score.
  const characters = [...text];
  const hangulCharacters = characters.filter((character) =>
    HANGUL_PATTERN.test(character),
  ).length;
  const letterCharacters = characters.filter((character) =>
    LETTER_PATTERN.test(character),
  ).length;

  return (
    hangulCharacters >= 20 &&
    hangulCharacters / Math.max(letterCharacters, 1) >= 0.35
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function classifyError(
  error: unknown,
): Extract<YoutubeTranscriptResult, { status: "unavailable" }>["reason"] {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("abort") ||
    message.includes("timeout") ||
    message.includes("timed out")
  ) {
    return "timeout";
  }

  if (
    message.includes("login_required") ||
    message.includes("not a bot") ||
    message.includes("429") ||
    message.includes("403")
  ) {
    return "blocked";
  }

  return "upstream_error";
}

export function createYoutubeTranscriptExecutor(
  fetchDetails: YoutubeDetailsFetcher = getVideoDetails,
): (
  input: YoutubeTranscriptInput,
  abortSignal: AbortSignal,
) => Promise<YoutubeTranscriptResult> {
  return async (input, abortSignal) => {
    const videoId = getVideoId(input.videoUrl);

    if (!videoId) {
      return {
        status: "unavailable",
        videoId: null,
        videoUrl: input.videoUrl,
        reason: "invalid_url",
        detail: "Use a public YouTube watch, short, embed, live, or youtu.be URL.",
      };
    }

    const videoUrl = canonicalVideoUrl(videoId);

    try {
      const details = await fetchDetails({
        videoID: videoId,
        lang: input.language,
        fetch: createTimedFetch(15_000, abortSignal),
      });
      const segments = details.subtitles
        .map((segment) => ({
          start: Number(segment.start),
          duration: Number(segment.dur),
          text: segment.text.trim(),
        }))
        .filter(
          (segment) =>
            Number.isFinite(segment.start) &&
            Number.isFinite(segment.duration) &&
            segment.start >= 0 &&
            segment.duration >= 0 &&
            segment.text.length > 0,
        );

      if (segments.length === 0) {
        return {
          status: "unavailable",
          videoId,
          videoUrl,
          reason: "no_caption_track",
          detail: "YouTube returned the video metadata but no usable caption text.",
        };
      }

      if (!hasKoreanTranscript(segments.map((segment) => segment.text).join(" "))) {
        return {
          status: "unavailable",
          videoId,
          videoUrl,
          reason: "language_unverified",
          detail:
            "A caption track was returned, but it was not sufficiently Korean to verify for this tutor.",
        };
      }

      const limitedSegments = segments.slice(0, input.maxSegments);

      return {
        status: "ok",
        videoId,
        videoUrl,
        title: details.title,
        language: "ko",
        languageEvidence: "hangul-dominant",
        segments: limitedSegments,
        truncated: limitedSegments.length < segments.length,
      };
    } catch (error) {
      return {
        status: "unavailable",
        videoId,
        videoUrl,
        reason: classifyError(error),
        detail: getErrorMessage(error).slice(0, 500),
      };
    }
  };
}
