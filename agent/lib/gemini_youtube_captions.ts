import { generateText, Output } from "ai";
import { z } from "zod";

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const HANGUL_PATTERN = /[\uac00-\ud7a3]/u;
const LETTER_PATTERN = /\p{L}/u;

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

export const geminiYoutubeCaptionsInputSchema = z.object({
  videoUrl: z.string().url().describe("A public YouTube video URL."),
  maxCaptions: z
    .number()
    .int()
    .min(1)
    .max(5)
    .default(3)
    .describe("Maximum number of short caption lines to return."),
});

const captionSchema = z.object({
  timestamp: z
    .string()
    .min(1)
    .max(24)
    .describe("An approximate timestamp such as 00:42."),
  text: z
    .string()
    .min(1)
    .max(300)
    .describe("A short Korean caption or transcript line."),
});

const geminiResponseSchema = z.object({
  captions: z.array(captionSchema).max(5),
});

export const geminiYoutubeCaptionsOutputSchema = z.discriminatedUnion(
  "status",
  [
    z.object({
      status: z.literal("ok"),
      videoUrl: z.string().url(),
      source: z.literal("gemini-video-transcript"),
      timestampAccuracy: z.literal("approximate"),
      captions: z.array(captionSchema).min(1).max(5),
    }),
    z.object({
      status: z.literal("unavailable"),
      videoUrl: z.string().url(),
      reason: z.enum([
        "invalid_url",
        "no_caption_text",
        "language_unverified",
        "blocked",
        "timeout",
        "upstream_error",
      ]),
      detail: z.string(),
    }),
  ],
);

export type GeminiYoutubeCaptionsInput = z.infer<
  typeof geminiYoutubeCaptionsInputSchema
>;
export type GeminiYoutubeCaptionsResult = z.infer<
  typeof geminiYoutubeCaptionsOutputSchema
>;
type GeminiResponse = z.infer<typeof geminiResponseSchema>;

export type GeminiCaptionGenerator = (
  videoUrl: string,
  maxCaptions: number,
  abortSignal: AbortSignal,
) => Promise<GeminiResponse>;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function hasKoreanCaptions(captions: readonly { text: string }[]): boolean {
  const text = captions.map((caption) => caption.text).join(" ");
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
): Extract<GeminiYoutubeCaptionsResult, { status: "unavailable" }>["reason"] {
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

async function generateGeminiCaptions(
  videoUrl: string,
  maxCaptions: number,
  abortSignal: AbortSignal,
): Promise<GeminiResponse> {
  const result = await generateText({
    model: "google/gemini-3.6-flash",
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
              "Return up to the requested number of short Korean caption lines from this public YouTube video.",
              "Prefer the available caption or transcript text. Do not invent, translate, paraphrase, or explain the lines.",
              "If no Korean caption or transcript text is available, return an empty captions array.",
              `Requested maximum: ${maxCaptions}.`,
            ].join("\n"),
          },
        ],
      },
    ],
    output: Output.object({
      schema: geminiResponseSchema,
      name: "youtube_captions",
      description: "Short Korean caption lines with approximate timestamps.",
    }),
    maxRetries: 1,
    timeout: 90_000,
    abortSignal,
  });

  if (result.output === undefined) {
    throw new Error("Gemini returned no structured caption output.");
  }

  return result.output;
}

export function createGeminiYoutubeCaptionsExecutor(
  generateCaptions: GeminiCaptionGenerator = generateGeminiCaptions,
): (
  input: GeminiYoutubeCaptionsInput,
  abortSignal: AbortSignal,
) => Promise<GeminiYoutubeCaptionsResult> {
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
      const response = await generateCaptions(
        input.videoUrl,
        input.maxCaptions,
        abortSignal,
      );
      const captions = response.captions
        .map((caption) => ({
          timestamp: caption.timestamp.trim(),
          text: caption.text.trim(),
        }))
        .filter((caption) => caption.timestamp.length > 0 && caption.text.length > 0)
        .slice(0, input.maxCaptions);

      if (captions.length === 0) {
        return {
          status: "unavailable",
          videoUrl: input.videoUrl,
          reason: "no_caption_text",
          detail: "Gemini could not access usable Korean caption or transcript text.",
        };
      }

      if (!hasKoreanCaptions(captions)) {
        return {
          status: "unavailable",
          videoUrl: input.videoUrl,
          reason: "language_unverified",
          detail:
            "Gemini returned caption text, but it was not sufficiently Korean to verify for this tutor.",
        };
      }

      return {
        status: "ok",
        videoUrl: input.videoUrl,
        source: "gemini-video-transcript",
        timestampAccuracy: "approximate",
        captions,
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
