# Effect-based agent observability

Status: initial implementation complete locally on Effect `4.0.0-rc.117`.
Not deployed or production-verified. This document separates implemented
behavior from remaining work.

## Outcome

Follow tutor interactions through model steps, tool requests/results and final
Telegram delivery. Eve continues to own durable sessions and schedules;
Supermemory remains the learning store. This does not validate citations or
prove memory persistence. Those safeguards belong to the separate
[mining evidence spec](mining-evidence-observability.md).

## Architecture implemented

One private Bun workspace, `@eve-kr-tutor/observability`, pins the same Effect v4
release candidate as the app. Its TypeScript exports bundle in the local Eve
build; Vercel deployment remains unverified.

- `packages/observability/src/index.ts`: exports only.
- `events.ts`: JSON-compatible diagnostic field types, not an exhaustive domain union.
- `logger.ts`: native `Logger.layer([Logger.consoleJson])` and a small `record`
  function using `Effect.logInfo`/`Effect.logError` plus `Effect.annotateLogs`.
- `observe.ts`: Effect clock timing, `Effect.onExit` and local `Effect.withSpan`.
- `agent/lib/observability.ts`: projects Eve events into safe diagnostic fields.
- `agent/lib/tool-diagnostics.ts`: explicit tool video IDs and outcome flags;
  no text scanning, hashing, recursive inspection or payload serialization.
- `agent/lib/telegram-delivery.ts`: one delivery Effect, a per-chunk helper and
  a thin, contextually typed Eve adapter. Tests provide logger Layers directly
  to the delivery Effect; no handler factory is needed.

Prefer native Effect implementations. No custom logger serializer, LogSink,
duplicate Observability dependency class, recursive inspector, or nested runtime.
Execute Effect only at Eve callback adapters. Test loggers are supplied through
Effect's native Logger Layer, not a separate application sink interface.

## Logging contract

Accept Effect's native JSON format. `message` is the event name; `annotations`
holds `service`, session/turn IDs, call IDs, step indices, tool outcomes and
available deployment metadata. Level, timestamp, fiber and span fields belong
to Effect. There is no custom schemaVersion or custom top-level field layout.
Update log queries accordingly; see [the runbook](../observability.md).

Application projection excludes raw prompts, messages, memory, credentials,
reasoning and provider error objects. Log annotations contain only explicitly
selected fields. The logging package is not a general-purpose sanitizer: callers
must not pass private content or attach raw errors as Effect log causes.

Tool requests are not execution acknowledgments. Result status, MCP reported
errors and excerpt availability remain distinct. A turn completing does not
prove semantic correctness or Telegram delivery. Missing retained logs do not
prove that no action occurred.

## Failure, delivery and timing semantics

Only logging/observer failures are suppressed using Effect error handling.
Observer callback construction is deferred with `Effect.suspend` so synchronous
callback throws are contained too, not just failures in the returned Effect.
Business failures retain their original outcome. Telegram Promise rejection is
kept in the Effect error channel without a redundant wrapper class. The pinned
v4 runtime propagates the original Error through `Effect.runPromise`; an identity
assertion tests this behavior. Shared and per-chunk fields use scoped annotations
rather than repeated record spreading.

Send chunks sequentially, log each attempt with a fresh attempt ID, acknowledge
success only after a message ID is returned, and stop on the first failure.
Failed requests currently report delivery as unknown. No retry or exactly-once
guarantee is added. Empty and tool-call intermediate messages remain unsent.

Measure operation duration with Effect's monotonic clock on success and failure.
Spans describe operations actually executed here, not merely receipt of an Eve
tool-request event. There is no exporter or distributed trace propagation yet.
Eve IDs—not fiber state—correlate durable workflow events across invocations.

## Verified locally

Tests cover tool correlation and private-data exclusion; partial Telegram
delivery; preservation of original errors; logger/observer failures; concurrent
context isolation; and rejecting lookalike YouTube hosts. Typecheck and local
bundling are required after every migration change. These are not proof of live
production capture or complete mining validation.

## Remaining work

- Extend fixed-field projections only for useful, verified tool response shapes.
  Current projections inspect only excerpt video URL/status and top-level MCP
  error flags. Other bodies are omitted. Explicit video URLs over 2,048 characters
  are ignored; no message content is hashed or scanned. Add more fields only
  when a concrete debugging need justifies them.
- Decide whether domain-specific discriminated event types add useful safety;
  keep them in the app rather than coupling the shared package to Telegram/Eve.
- Add complete synthetic-turn coverage, controlled-clock/cancellation tests and
  explicit retry/replay tests where they prove behavior not already covered.
- If operationally needed, distinguish confirmed Telegram rejection from unknown
  delivery and add safe diagnostic categories without exposing provider bodies.
- After separately authorized deployment, verify a controlled turn and actual
  hosting retention. Exporter/collector selection is a separate decision.

Do not restore silent 8 KiB record dropping or custom serialization. If hosting
limits require bounded records, reduce app-projected fields explicitly and test
that policy without replacing Effect's formatter.

## Version decision and scope

The user explicitly selected v4 over the earlier v3 plan. `effect-smol` is
archived; use the canonical [Effect repository](https://github.com/Effect-TS/effect)
and the pinned package's v4 declarations as implementation references. V3 snippets
and APIs in earlier discussions are superseded.

No new database, scheduler, dashboard, Effect AI migration, citation validator,
npm publication or whole-agent rewrite. Commit, push and deployment are separate
actions. The tutor's AI model has not been changed by this migration.
