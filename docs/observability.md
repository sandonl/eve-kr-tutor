# Agent observability

## Effect v4 implementation

The private Bun workspace `packages/observability` pins Effect `4.0.0-rc.117`.
Its index only exports the typed event interface, logger Layer and operation
observer. Eve translation and explicit tool metadata stay in `agent/lib`.
Production uses `Logger.layer([Logger.consoleJson])`. Correlation fields are
scoped with `Effect.annotateLogs`; tests supply native Effect logger Layers.
There is no custom sink, JSON encoder, envelope or logging class. Runtimes
execute only at the Eve callback adapters.

Effect's native JSON format replaces the earlier custom schema: `message`
contains the event name, `annotations` contains service, session/turn/call IDs,
tool outcomes and delivery attempt IDs. `level` and `timestamp` are native
Effect fields; there is no application `schemaVersion`. Delivery runs sequentially
using one delivery Effect and a thin Eve adapter. Original rejection identity is
preserved without wrapping/unwrapping errors. Tests provide native logger Layers
to the delivery Effect. Logger and observer failures cannot replace business outcomes.
Local operation spans are not exported distributed traces.

This is the initial migration, not every hardening item in the spec: event names
are currently extensible rather than an exhaustive domain union; no custom
record-size dropping policy remains. Tool projections read fixed own data fields
without traversing or serializing payloads. No message hashing or text scanning
is performed. Video IDs come only from the excerpt tool's explicit URL field
(URLs over 2,048 characters are ignored).
Unknown tools and search/fetch/MCP result bodies are omitted; runtime outcome
and a top-level MCP error flag remain available. No vendor
exporter or production deployment is included.

The root agent emits structured JSON to runtime logs on all channels, including
scheduled lessons once they enter an agent session. No database or external
logging vendor is required; Supermemory remains the learning-state store.

## Investigate a conversation

1. Open Vercel runtime logs for the deployment and time window. Search for
   `eve-kr-tutor` (`annotations.service`). With a recent Vercel CLI:
   `vercel logs --environment production --since 1h --json`.
2. Find `message.received` in `message`, then filter by `annotations.sessionId`
   and `annotations.turnId`. All application fields below live in `annotations`.
3. Follow `action.requested` and `action.result`, joining by `callId`.
   `stepIndex` groups model steps; `step.started` includes the model and
   `step.completed` includes reported usage. Emission timestamps help locate
   delays; requested-to-result time includes queuing/approval, not just execution.
4. Inspect `message.completed` and `telegram.delivery.*`. A successful delivery
   has a Telegram `messageId`. Multi-part replies have zero-based `chunkIndex`.
   A failed chunk stops subsequent sends. A timeout is an unknown delivery
   outcome: do not blindly replay the whole answer.

For the incorrect YouTube incident, inspect `input.videoId` and `output.videoId`
on excerpt-tool calls. Compare these manually with the learner's reported reply;
final-answer content and links are not captured in logs.
Search/fetch result bodies are not inspected. For “saved your preference,” check whether a memory
write was requested and what it returned. For “I cannot find the channel,” check
whether search was requested and whether it failed. Missing events can also mean
missing/expired logs; absence is not proof that an action never happened.

## Meaning and privacy

- `action.requested` does not mean executed. Result `status` distinguishes
  completed, failed and rejected. `isError` reflects the runtime tool result;
  `output.reportedError` also detects a top-level MCP error envelope.
- `output.excerptAvailable` records an authored excerpt's `ok`/`unavailable`
  outcome. It is not verification that the excerpt matches the video.
- No text fingerprints, message scanning or content summaries are produced.
  Raw messages, prompts, tool arguments/results, memory,
  arbitrary URLs, credentials, auth context and reasoning are not logged.
  Explicit tool video IDs are still conversation metadata; restrict access and
  retention accordingly.
- Errors retain runtime error codes, not raw error
  messages (which can contain credentials). Some investigations will require
  a controlled reproduction to obtain more detail.
- `eventId` identifies a durable Eve event. Hooks are at-least-once; a retried
  step may emit new event IDs. Delivery logs are attempts, not an exactly-once
  guarantee. Logging failures are swallowed so they cannot break tutoring.
- Default Telegram error/progress handlers are unchanged. The chunk-level
  delivery instrumentation covers final learner replies, not every Telegram
  API operation. Pre-session webhook/auth and schedule-dispatch failures remain
  platform/runtime diagnostics. Child agents would need their own hooks.

## Boundaries

These logs take effect only after deployment; they cannot reconstruct earlier
incidents. Retention and search are provided by the hosting platform. This is
diagnostic telemetry, not a durable audit store or dashboard. If platform
retention becomes insufficient, add a log drain rather than a learning database.

This change does not enforce source validation, read back memory writes, or
automatically judge whether the user request was fulfilled. The mining evidence
spec describes those separate safeguards. Tests cover correlation/privacy,
partial Telegram delivery, and behavior when logging fails; they do not claim
to exercise a complete model-to-validation mining turn.
