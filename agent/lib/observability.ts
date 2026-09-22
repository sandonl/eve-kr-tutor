import { toolInputMetadata, toolResultMetadata } from "./tool-diagnostics.js";
import type { HookContext, HookEvent } from "eve/hooks";
import { Effect, type Layer } from "effect";
import { loggingLayer, record, type DiagnosticEvent } from "@eve-kr-tutor/observability";

export function observeEvent(event: HookEvent, ctx: Pick<HookContext, "session" | "channel">, logger: Layer.Layer<never> = loggingLayer): void {
  const project = Effect.sync(() => {
    const records: DiagnosticEvent[] = [];
    const data = "data" in event ? event.data : {};
    const common = { event: event.type, eventId: event.meta.id, emittedAt: event.meta.at,
      sessionId: ctx.session.id, turnId: "turnId" in data ? data.turnId : ctx.session.turn.id,
      channel: ctx.channel.kind, sequence: "sequence" in data ? data.sequence : undefined,
      stepIndex: "stepIndex" in data && typeof data.stepIndex === "number" ? data.stepIndex : undefined,
      deployment: process.env.VERCEL_URL, revision: process.env.VERCEL_GIT_COMMIT_SHA };
    const log = (fields: Omit<DiagnosticEvent, "event"> = {}) => {
      records.push({ ...common, ...fields });
    };
    switch (event.type) {
      case "actions.requested":
        for (const action of event.data.actions) log({ event: "action.requested", callId: action.callId,
          actionKind: action.kind, toolName: "toolName" in action ? action.toolName : undefined,
          input: toolInputMetadata("toolName" in action ? action.toolName : action.kind, action.input) });
        break;
      case "action.result": {
        const result = event.data.result;
        log({ callId: result.callId, actionKind: result.kind,
          toolName: "toolName" in result ? result.toolName : undefined,
          status: event.data.status, isError: result.isError === true,
          output: toolResultMetadata("toolName" in result ? result.toolName : result.kind, result.output) });
        break;
      }
      case "message.received": log(); break;
      case "message.completed": log({ finishReason: event.data.finishReason }); break;
      case "step.started": log({ modelId: event.data.modelId }); break;
      case "step.completed": log({ finishReason: event.data.finishReason, usage: event.data.usage }); break;
      case "step.failed": case "turn.failed": case "session.failed":
        log({ code: event.data.code }); break;
      case "session.started": case "session.completed": case "session.waiting":
      case "turn.started": case "turn.completed": case "turn.cancelled":
      case "approval.candidate": case "approval.settled": case "authorization.required":
        log(); break;
      // Never record reasoning, streaming fragments, auth payloads, or memory bodies.
      default: break;
    }
    return records;
  });
  Effect.runSync(project.pipe(
    Effect.flatMap((records) => Effect.forEach(records, record, { discard: true })),
    Effect.annotateLogs({ service: "eve-kr-tutor" }),
    Effect.provide(logger),
    Effect.catchCause(() => Effect.void),
  ));
}
