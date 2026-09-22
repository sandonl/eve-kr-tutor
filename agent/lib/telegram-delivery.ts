import { randomUUID } from "node:crypto";
import { Effect, Exit } from "effect";
import { splitTelegramMessageText, type TelegramChannelEvents } from "eve/channels/telegram";
import { loggingLayer, observeOperation, record } from "@eve-kr-tutor/observability";

type Reply = { message: string | null; finishReason: string };
type SendMessage = (text: string) => Promise<{ id: string }>;

function sendChunk(text: string, chunkIndex: number, send: SendMessage) {
  return Effect.gen(function* () {
    yield* record({ event: "telegram.delivery.attempted" });
    yield* observeOperation("telegram.send", Effect.tryPromise({
      try: () => send(text),
      catch: (cause) => cause,
    }), (exit, durationMs) => {
      if (Exit.isSuccess(exit)) return record({
        event: "telegram.delivery.succeeded", messageId: exit.value.id, durationMs,
      });
      // A failed request does not establish whether Telegram received the chunk.
      return record({ event: "telegram.delivery.failed", outcome: "unknown", durationMs });
    });
  }).pipe(Effect.annotateLogs({ chunkIndex, attemptId: randomUUID() }));
}

export function deliverTelegramReply(reply: Reply, send: SendMessage) {
  return Effect.suspend(() => {
    if (reply.finishReason === "tool-calls" || !reply.message) return Effect.void;
    const chunks = splitTelegramMessageText(reply.message);
    return Effect.forEach(chunks, (text, index) => sendChunk(text, index, send), {
      concurrency: 1, discard: true,
    }).pipe(Effect.annotateLogs({ channel: "telegram", chunkCount: chunks.length }));
  });
}

export const deliverTelegramMessage: NonNullable<TelegramChannelEvents["message.completed"]> =
  (data, channel, ctx) => Effect.runPromise(
    deliverTelegramReply(data, (text) => channel.telegram.post(text)).pipe(
      Effect.annotateLogs({ service: "eve-kr-tutor", sessionId: ctx.session.id,
        turnId: data.turnId, stepIndex: data.stepIndex, sequence: data.sequence }),
      Effect.provide(loggingLayer),
    ),
  );
