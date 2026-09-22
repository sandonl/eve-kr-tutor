import assert from "node:assert/strict";
import { test } from "node:test";
import { observeEvent } from "../agent/lib/observability.js";
import { Effect, Logger } from "effect";
import { captureLogs } from "./capture-logs.js";
import { deliverTelegramReply } from "../agent/lib/telegram-delivery.js";

const context = { session: { id: "session-test", turn: { id: "turn-test", sequence: 1 },
  auth: { current: null, initiator: null } }, channel: { kind: "telegram", continuationToken: "secret-token" } };
const meta = { id: "event-test", at: "2026-09-22T00:00:00Z" };
const coordinates = { turnId: "turn-test", sequence: 1, stepIndex: 0 };

test("tool requests and outcomes can be joined without leaking memory, credentials or reasoning", () => {
  const { logs, layer } = captureLogs();
  observeEvent({ type: "actions.requested", meta, data: { ...coordinates, actions: [{
    kind: "tool-call", callId: "call-test", toolName: "supermemory__add_memory",
    input: { text: "private-memory", authorization: "secret-key" },
  }] } }, context, layer);
  observeEvent({ type: "action.result", meta: { ...meta, id: "result-test" }, data: {
    ...coordinates, status: "completed", result: { kind: "tool-result", callId: "call-test",
      toolName: "supermemory__add_memory", output: { isError: true, content: "private-error" } },
  } }, context, layer);
  observeEvent({ type: "reasoning.completed", meta, data: { ...coordinates, reasoning: "hidden-reasoning" } }, context, layer);
  assert.equal(logs.length, 2);
  assert.equal(logs[0]?.annotations.callId, "call-test");
  assert.equal(logs[0]?.annotations.callId, logs[1]?.annotations.callId);
  assert.equal(logs[1]?.annotations.turnId, "turn-test");
  const output = logs[1]?.annotations.output;
  assert.ok(typeof output === "object" && output !== null && "reportedError" in output);
  assert.equal(output.reportedError, true);
  assert.doesNotMatch(JSON.stringify(logs), /private-memory|secret-key|private-error|secret-token|hidden-reasoning/);
});

test("delivery records each actual chunk and preserves partial delivery failures", async () => {
  const { logs, layer } = captureLogs();
  const sent: string[] = [];
  const failure = new Error("private Telegram credential error");
  await assert.rejects(Effect.runPromise(deliverTelegramReply({ finishReason: "stop", message: "a".repeat(9000) },
    async (message) => {
      assert.equal(typeof message, "string");
      sent.push(String(message));
      if (sent.length === 2) throw failure;
      return { id: "telegram-first" };
    }).pipe(Effect.provide(layer))), (error) => error === failure);
  assert.equal(sent.length, 2);
  assert.ok(sent.every((chunk) => chunk.length <= 4096));
  assert.deepEqual(logs.map((record) => record.message), ["telegram.delivery.attempted", "telegram.delivery.succeeded",
    "telegram.delivery.attempted", "telegram.delivery.failed"]);
  assert.equal(logs[1]?.annotations.messageId, "telegram-first");
  assert.equal(logs[3]?.annotations.chunkIndex, 1);
  assert.doesNotMatch(JSON.stringify(logs), /private Telegram/);
});

test("logging failures do not break delivery and tool-call text is not sent", async () => {
  const logger = Logger.layer([Logger.make(() => { throw new Error("logger unavailable"); })]);
  const sent: string[] = [];
  const send = async (message: string) => {
    sent.push(message); return { id: "delivered" };
  };
  await Effect.runPromise(Effect.gen(function* () {
    yield* deliverTelegramReply({ finishReason: "tool-calls", message: "working" }, send);
    yield* deliverTelegramReply({ finishReason: "stop", message: "" }, send);
    yield* deliverTelegramReply({ finishReason: "stop", message: "final answer" }, send);
  }).pipe(Effect.provide(logger)));
  assert.deepEqual(sent, ["final answer"]);
});

test("final answers log lifecycle metadata without inspecting their text", () => {
  const { logs, layer } = captureLogs();
  observeEvent({ type: "message.completed", meta, data: { ...coordinates, finishReason: "stop",
    message: "private answer https://www.youtube.com/watch?v=dQw4w9WgXcQ" } }, context,
    layer);
  assert.equal(logs.length, 1);
  assert.equal(logs[0]?.message, "message.completed");
  assert.equal(logs[0]?.annotations.finishReason, "stop");
  assert.doesNotMatch(JSON.stringify(logs), /private answer|dQw4w9WgXcQ|sha256|content/);
});
