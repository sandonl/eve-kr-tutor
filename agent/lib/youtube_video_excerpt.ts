import { generateText, Output } from "ai";
import { z } from "zod";
import { tutorModel } from "../model.js";

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const HANGUL_PATTERN = /[\uac00-\ud7a3]/u;
const LETTER_PATTERN = /\p{L}/u;
const MAX_LINES = 3;

function getYoutubeVideoId(videoUrl: string): string | null {
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

export const youtubeVideoExcerptInputSchema = z.object({
  videoUrl: z.string().url().describe("A public YouTube video URL."),
});

const lineSchema = z.object({
  timestamp: z
    .string()
    .min(1)
    .max(24)
    .describe("An approximate timestamp such as 00:42."),
  text: z
    .string()
    .min(1)
    .max(300)
    .describe("A short Korean line visible as an on-screen caption."),
});

const excerptSchema = z.object({
  lines: z.array(lineSchema).max(MAX_LINES),
});

export const youtubeVideoExcerptOutputSchema = z.discriminatedUnion(
  "status",
  [
    z.object({
      status: z.literal("ok"),
      videoUrl: z.string().url(),
      source: z.literal("gemini-video-excerpt"),
      timestampAccuracy: z.literal("approximate"),
      lines: z.array(lineSchema).min(1).max(MAX_LINES),
    }),
    z.object({
      status: z.literal("unavailable"),
      videoUrl: z.string().url(),
      reason: z.enum([
        "invalid_url",
        "no_visible_captions",
        "language_unverified",
        "blocked",
        "timeout",
        "upstream_error",
      ]),
      detail: z.string(),
    }),
  ],
);

export type YoutubeVideoExcerptInput = z.infer<
  typeof youtubeVideoExcerptInputSchema
>;
export type YoutubeVideoExcerptResult = z.infer<
  typeof youtubeVideoExcerptOutputSchema
>;
type YoutubeExcerpt = z.infer<typeof excerptSchema>;

export type YoutubeExcerptGenerator = (
  videoUrl: string,
  abortSignal: AbortSignal,
) => Promise<YoutubeExcerpt>;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function hasKoreanLines(lines: readonly { text: string }[]): boolean {
  const text = lines.map((line) => line.text).join(" ");
  const characters = [...text];
  const hangulCharacters = characters.filter((character) =>
    HANGUL_PATTERN.test(character),
  ).length;
  const letterCharacters = characters.filter((character) =>
    LETTER_PATTERN.test(character),
  ).length;

  return (
    hangulCharacters >= 2 &&
    hangulCharacters / Math.max(letterCharacters, 1) >= 0.25
  );
}

function classifyError(
  error: unknown,
): Extract<YoutubeVideoExcerptResult, { status: "unavailable" }>["reason"] {
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
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("429") ||
    message.includes("403")
  ) {
    return "blocked";
  }

  return "upstream_error";
}

async function generateYoutubeVideoExcerpt(
  videoUrl: string,
  abortSignal: AbortSignal,
): Promise<YoutubeExcerpt> {
  const result = await generateText({
    model: tutorModel,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "file",
            data: new URL(videoUrl),
            mediaType: "video/mp4",
          },
          {
            type: "text",
            text: [
              `Return up to ${MAX_LINES} short, consecutive Korean lines that are visibly displayed as on-screen captions or subtitles in one nearby moment of this public YouTube video.`,
              "Prefer a compact exchange or a sentence with adjacent context. Preserve the source order and do not combine distant moments.",
              "Read the visible caption text only. Return each line in full with its original Hangul and punctuation; do not romanize or transliterate, add pronunciation spellings, add ellipses, truncate, transcribe speech from audio, invent, translate, paraphrase, or explain the lines.",
              "If a caption is only partly visible or clearly incomplete, omit it rather than guessing the missing text.",
              "If the visible text is romanized, mixed-script, or not confidently readable as Korean Hangul, omit it and return an empty lines array if no usable Hangul caption remains.",
              "If you cannot confidently identify visible Korean caption or subtitle text, return an empty lines array.",
            ].join("\n"),
          },
        ],
      },
    ],
    output: Output.object({
      schema: excerptSchema,
      name: "youtube_video_excerpt",
      description: "Short Korean on-screen caption lines with approximate timestamps.",
    }),
    maxRetries: 1,
    timeout: 90_000,
    abortSignal,
  });

  if (result.output === undefined) {
    throw new Error("Gemini returned no structured video excerpt.");
  }

  return result.output;
}

export function createYoutubeVideoExcerptExecutor(
  generateExcerpt: YoutubeExcerptGenerator = generateYoutubeVideoExcerpt,
): (
  input: YoutubeVideoExcerptInput,
  abortSignal: AbortSignal,
) => Promise<YoutubeVideoExcerptResult> {
  return async (input, abortSignal) => {
    if (!getYoutubeVideoId(input.videoUrl)) {
      return {
        status: "unavailable",
        videoUrl: input.videoUrl,
        reason: "invalid_url",
        detail: "Use a public YouTube watch, short, embed, live, or youtu.be URL.",
      };
    }

    try {
      const response = await generateExcerpt(
        input.videoUrl,
        abortSignal,
      );
      const lines = response.lines
        .map((line) => ({
          timestamp: line.timestamp.trim(),
          text: line.text.trim(),
        }))
        .filter((line) => line.timestamp.length > 0 && line.text.length > 0)
        .slice(0, MAX_LINES);

      if (lines.length === 0) {
        return {
          status: "unavailable",
          videoUrl: input.videoUrl,
          reason: "no_visible_captions",
          detail: "Gemini could not access usable Korean on-screen caption or subtitle text.",
        };
      }

      if (!hasKoreanLines(lines)) {
        return {
          status: "unavailable",
          videoUrl: input.videoUrl,
          reason: "language_unverified",
          detail:
            "Gemini returned on-screen text, but it was not sufficiently Korean to verify for this tutor.",
        };
      }

      return {
        status: "ok",
        videoUrl: input.videoUrl,
        source: "gemini-video-excerpt",
        timestampAccuracy: "approximate",
        lines,
      };
    } catch (error) {
      return {
        status: "unavailable",
        videoUrl: input.videoUrl,
        reason: classifyError(error),
        detail: getErrorMessage(error).slice(0, 500),
      };
    }
  };
}
