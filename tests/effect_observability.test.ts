import assert from "node:assert/strict";
import { test } from "node:test";
import { Cause, Effect, Exit, Option, Logger } from "effect";
import { observeOperation, record } from "@eve-kr-tutor/observability";
import { captureLogs } from "./capture-logs.js";
import { toolInputMetadata, toolResultMetadata } from "../agent/lib/tool-diagnostics.js";

test("a synchronous observer callback throw cannot fail a successful operation", async () => {
  const result = await Effect.runPromise(observeOperation("test.send", Effect.succeed("delivered"),
    () => { throw new Error("callback construction failed"); }));
  assert.equal(result, "delivered");
});

test("a synchronous observer callback throw does not add defects to the original failure", async () => {
  const original = Effect.fail("delivery rejected");
  const actual = await Effect.runPromiseExit(observeOperation("test.send", original,
    () => { throw new Error("callback construction failed"); }));
  assert.ok(Exit.isFailure(actual));
  assert.equal(actual.cause.reasons.length, 1);
  const reason = actual.cause.reasons[0];
  assert.ok(reason && reason._tag === "Fail");
  assert.equal(reason.error, "delivery rejected");
});

test("tool projections inspect only known fields, without traversing or serializing payloads", () => {
  const payload = {
    videoUrl: "https://youtu.be/HcSDDe0TD2U", status: "ok", isError: false,
    get lines() { throw new Error("must not read transcript"); },
    toJSON() { throw new Error("must not serialize payload"); },
  };
  const input = toolInputMetadata("youtube_video_excerpt", payload);
  const output = toolResultMetadata("youtube_video_excerpt", payload);
  assert.match(JSON.stringify(input), /HcSDDe0TD2U/);
  assert.match(JSON.stringify(output), /"excerptAvailable":true/);
  assert.deepEqual(toolResultMetadata("supermemory__search_memory", payload), { reportedError: false });
  const cycle: { self?: unknown } = {};
  cycle.self = cycle;
  assert.deepEqual(toolInputMetadata("unknown", cycle), {});
  const accessor = { get videoUrl() { throw new Error("must not invoke accessor"); } };
  assert.doesNotThrow(() => toolInputMetadata("youtube_video_excerpt", accessor));
});

test("observer failure cannot recover or replace the operation's typed error", async () => {
  const failure = { _tag: "DeliveryRejected" };
  let observed = false;
  const exit = await Effect.runPromiseExit(observeOperation("test.send", Effect.fail(failure),
    (outcome, durationMs) => Effect.sync(() => {
      observed = Exit.isFailure(outcome);
      assert.ok(durationMs >= 0);
      throw new Error("observer defect");
    })));
  assert.equal(observed, true);
  assert.ok(Exit.isFailure(exit));
  const error = Cause.findErrorOption(exit.cause);
  assert.ok(Option.isSome(error));
  assert.equal(error.value, failure);
});

test("parallel operations retain their own context and failed events have error severity", async () => {
  const { logs, layer } = captureLogs();
  await Effect.runPromise(Effect.forEach(["turn-a", "turn-b"], (turnId) =>
    observeOperation("test.operation", Effect.yieldNow, () =>
      record({ event: "operation.failed", turnId })), { concurrency: 2 }).pipe(
        Effect.provide(layer),
      ));
  assert.deepEqual(logs.map((entry) => entry.annotations.turnId).sort(), ["turn-a", "turn-b"]);
  assert.ok(logs.every((entry) => entry.level === "ERROR"));
});

test("broken sink leaves successful operation result untouched", async () => {
  const result = await Effect.runPromise(observeOperation("test.operation", Effect.succeed(42),
    () => record({ event: "operation.completed" })).pipe(
      Effect.provide(Logger.layer([Logger.make(() => { throw new Error("logger defect"); })])),
    ));
  assert.equal(result, 42);
});

test("video metadata uses only an explicit trusted URL, never arbitrary text", () => {
  const metadata = (videoUrl: string) => toolInputMetadata("youtube_video_excerpt", { videoUrl });
  assert.equal(metadata("https://evil-youtube.com/watch?v=dQw4w9WgXcQ").videoId, undefined);
  assert.equal(metadata("https://youtu.be/HcSDDe0TD2U").videoId, "HcSDDe0TD2U");
  assert.equal(metadata("private https://youtu.be/HcSDDe0TD2U").videoId, undefined);
  assert.equal(metadata("https://youtu.be/HcSDDe0TD2U?token=" + "x".repeat(4096)).videoId, undefined);
});
