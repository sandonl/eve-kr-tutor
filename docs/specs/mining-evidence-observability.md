# Sentence-mining evidence validation and observability

## Problem Statement

The tutor sent three sentence mines attributed to different Korean programmes, all citing the same Rick Astley video. The learner cannot trust the claimed sources, and the available production request logs do not show the model's tool calls or the evidence used to create the answer. HTTP 200 only establishes request handling, not lesson correctness or Telegram delivery.

The incident establishes incorrect attribution. Whether the model skipped retrieval, ignored a failed retrieval, or invented the link after retrieval remains unknown. The implementation must make those cases distinguishable.

## Solution

Every mining turn will produce a bounded, correlated record of tool activity, evidence selection, validation, and outgoing Telegram delivery. Sentence mines will be rendered from structured proposals checked against evidence actually retrieved during that turn. Unsupported citations and quotations will never reach Telegram as source-backed examples.

Supermemory remains the learning store. Diagnostic events go to existing Vercel runtime logs. No separate database or observability vendor is required.

## User Stories

1. As a learner, I want each sentence mine to cite its actual source, so that opening the link supports the lesson.
2. As a learner, I want quoted Korean lines to match retrieved evidence, so that invented examples are not presented as source quotations.
3. As a learner, I want tutor-created examples clearly distinguished from source excerpts, so that I know what was retrieved.
4. As a learner, I want unavailable sources reported honestly, so that the tutor does not invent material to fill a batch.
5. As a learner, I want valid entries retained when other entries fail, so that partial source availability still produces a useful lesson.
6. As a learner, I want source titles to agree with the cited video, so that unrelated programmes cannot share an invented attribution.
7. As a learner, I want approximate video timestamps preserved, so that I can locate the relevant moment without being promised exact timing.
8. As a learner, I want ordinary conversation and daily Learning-pile review to keep working, so that mining validation does not disrupt other lessons.
9. As the maintainer, I want to find a turn by time, session, or Telegram message ID, so that I can investigate a reported answer.
10. As the maintainer, I want tool names, attempts, durations, and outcomes, so that I can distinguish a failed tool from a skipped tool.
11. As the maintainer, I want search queries and bounded source candidates recorded, so that I can understand discovery decisions.
12. As the maintainer, I want short retrieved excerpts tied to tool-call IDs, so that I can compare evidence with proposed quotations.
13. As the maintainer, I want rejected entries and specific reason codes recorded, so that I can identify why delivery was blocked.
14. As the maintainer, I want deployment and model identifiers attached, so that I can identify the version that produced an incident.
15. As the maintainer, I want tool retries and workflow resumptions correlated, so that repeated events are not mistaken for independent lessons.
16. As the maintainer, I want each outgoing Telegram chunk's delivery result recorded, so that partial delivery is visible.
17. As the learner, I want credentials and private learning memories excluded from diagnostics, so that debugging does not copy my whole learning history into logs.
18. As the maintainer, I want a repeatable test of the reported bad attribution, so that the failure cannot silently return.

## Implementation Decisions

### One controlled mining delivery path

Use a single mining orchestration boundary for manual sentence-mining requests and any future scheduled sentence digest. It owns evidence collection, structured proposals, validation, rendering, and Telegram delivery. Select this mode from the request/skill execution context, not by guessing from headings in the final text.

The sequence is: start turn → discover sources → retrieve evidence → propose mines → validate → render accepted mines → deliver → record outcome.

Override the native Telegram final-message delivery for mining turns so raw model text cannot bypass validation. Preserve normal channel behavior for conversation, daily lessons, authorisation, and human-input handling. Tool completion must not independently send a second copy of the lesson.

### Evidence belongs to the current turn

Successful retrieval creates an application-owned evidence record with an opaque evidence ID, session and turn identifiers, tool-call ID, canonical source identity, retrieved title when available, retrieval time, source kind, bounded Korean lines, and approximate timestamps where applicable. Search results are discovery candidates, not quotation evidence.

Keep these records in Eve's durable turn/workflow state, with identity checks on retrieval. Do not rely on process-global maps, log searches, or Supermemory as the validation registry. The implementation must verify the installed Eve public API supports persistence across resume/replay before choosing the concrete adapter; if necessary use a durable tool/workflow result carried through that same turn. Do not invent an unsupported framework API.

Evidence from previous turns or other chats is ineligible. In a long-lived private Telegram session, the session ID alone is insufficient isolation. Evidence IDs must be issued by trusted application code; model-supplied IDs do not create evidence.

### Structured proposal and deterministic rendering

The model proposes entries referencing an evidence ID and a contiguous selection of returned lines, plus the target language item, meaning, nuance, and a tutor-created example. Source URLs, titles, source quotations, and timestamps in the delivered message are populated from the trusted record, not independently authored by the model.

Resolve YouTube identity by the actual video ID while preserving a usable canonical source URL. Different URL spellings for the same video must not create distinct source identities. For written sources, retain the fetched source URL and any final redirect identity. Only successful, eligible retrievals can supply records.

Video title/channel metadata needs a successful source metadata lookup tied to the same video identity. Existing video analysis only returns lines and approximate timestamps; it does not establish a programme title. If metadata cannot be established, use a neutral source label rather than inventing a title. Metadata verifies attribution, not dialogue.

Written-source support follows the same evidence contract. A search snippet or arbitrary substring of an unrelated fetched page is insufficient. Select bounded source excerpts from the fetched body with recorded provenance.

### Validation and fallback

Check that every proposal references current-turn successful evidence, selects existing consecutive lines, contains an eligible Korean excerpt, and keeps source attribution consistent. Copy the source lines unchanged apart from documented whitespace normalization; never silently paraphrase them. Keep tutor-created text outside quotation fields.

Allow multiple distinct excerpts from one video with consistent attribution. Reject repeated evidence-line selections offered as separate mines. Do not use a Rick Astley URL blacklist as the fix: the rule must reject any unsupported attribution.

Record explicit reasons such as missing_evidence, stale_evidence, retrieval_unavailable, invalid_line_selection, attribution_mismatch, duplicate_excerpt, and invalid_proposal. Deliver the valid subset under the existing 3–5-mine policy; fewer than three require a brief source-limitation message. If none survive, deliver a concise unavailable response with no fabricated links or quotes. No unbounded regeneration loop.

This validation establishes fidelity to retrieved evidence. Gemini video analysis can itself misread captions, so passing validation must not be described as independently verified audio transcription or proof of factual truth.

### Structured diagnostic events

Emit versioned JSON events for turn start, tool start/completion/failure, evidence creation, validation completion, Telegram send attempt/completion/failure, and turn completion/failure. Include timestamp, deployment version, session ID, turn ID, trigger, model identifier where known, and tool-call/delivery attempt IDs where relevant. Use framework trace/workflow IDs when exposed; do not fabricate missing IDs.

Tool events include tool name, bounded input summary, elapsed time, attempt number, outcome and sanitized error category. Search events include a bounded query and returned URL/title candidates. Retrieval events include evidence ID, status, canonical URL, short lines and timestamps. Validation events include proposed/accepted/rejected counts, evidence references and reason codes. The absence of retrieval followed by rejected missing evidence must be distinguishable from an explicit retrieval failure.

Project known fields into events rather than serializing raw tool arguments/results. For Supermemory log operation name, timing, outcome and result count when available, without memory content. Exclude credentials, auth headers, full prompts, hidden reasoning, full transcripts, arbitrary signed URL query parameters and raw Telegram payloads. Set explicit size limits and mark truncation. Redact before serialization.

Use Vercel runtime logs initially. Optional future OpenTelemetry export is not required. Eve already supplies session/turn context and tool spans when authored telemetry is configured; reuse those public facilities where applicable rather than building a parallel tracing system. Full input/output capture stays disabled by default.

### Delivery and failure semantics

Log the attempt immediately before the Telegram request and acknowledge delivery only after Telegram reports success. Record every returned message ID when a lesson is split into chunks, together with chunk position and delivery attempt ID. The native helper returns only the first message result, so chunk-level observability requires controlling the bounded send loop or an equivalent supported transport hook.

Do not equate turn completion, webhook HTTP 200, or Eve inbound channel-delivery spans with outbound Telegram success. An ambiguous network timeout is delivery_unknown; do not claim delivery or automatically resend the full lesson. Record partial delivery without pretending the entire lesson succeeded. This spec does not promise exactly-once delivery.

Diagnostic logging failure must not send unvalidated output or cause a successfully delivered lesson to be sent again. Evidence state and validation are operational requirements; telemetry is a diagnostic side effect.

### Operational handoff

Provide a short runbook for finding a turn using time or Telegram message ID, following tool-call IDs, interpreting validation reasons, and checking delivery outcomes. Document actual production retention/access limits and distinguish missing retained logs from a run that never happened. Demonstrate the full path on a controlled turn before describing production observability as verified.

## Testing Decisions

- Primary confirmed seam: one complete mining turn through the actual evidence registry, validation, renderer and outgoing Telegram handler. Replace only external model/search/retrieval services and Telegram transport with controlled adapters. Assert delivered content and diagnostic outcomes, not private helper calls or copied prompt strings. Sandon confirmed this complete-outcome boundary.
- Reproduce the reported incident with three unrelated source labels and the same unsupported video reference. The actual delivery path must emit no unsupported mines and must record the rejection reason. Also prove the same rule works for an arbitrary unrelated URL.
- A valid retrieved source must produce a delivered mine with the exact retrieved URL, source lines and metadata, while preserving separately labelled tutor-created examples. This positive case prevents an implementation that simply blocks every message from passing.
- Exercise a mixed valid/invalid batch and a failed retrieval: only supported entries are delivered, with honest partial/unavailable wording and useful reasons in logs.
- Exercise current-turn isolation across durable resume and a second turn in the same session. A replay must not lose valid evidence, and a new turn must not reuse stale evidence.
- Exercise a Telegram failure after a successful first chunk: diagnostics identify acknowledged chunks and the failed/unknown chunk without reporting complete delivery or resending earlier chunks.
- Include secrets/private memory in external fixtures and assert they are absent from emitted diagnostics while evidence and correlation fields remain usable.
- Reuse the existing Node test conventions and injected video-excerpt executor. Existing routing evals prove tool usage but do not prove source-to-output fidelity; retain live model evals only as supplementary, non-deterministic checks. Avoid tests that merely assert prompt wording or that a mock returns its configured value.

## Out of Scope

- A new database or replacing Supermemory.
- Changing Unseen/Learning/Seen transitions or stable item-number allocation.
- Daily cron duplicate suppression, timezone changes or scheduling new mining jobs.
- Telegram topics, audio clipping, voice mode or recordings.
- A new dashboard, paid logging vendor, blanket logging of user conversations, or full source transcripts.
- Proving Gemini's caption interpretation against independent transcription, fact-checking all teaching explanations, or exactly-once Telegram delivery.

## Further Notes

The installed Eve version is 0.50.0. Its bundled instrumentation and Telegram documentation are the version-matched implementation references. The source mismatch was reported on 22 September 2026; the observed HTTP logs do not establish the tool sequence that caused it.

Useful upstream references: [Eve observability](https://github.com/vercel/eve/blob/main/docs/guides/instrumentation.md), [Eve Telegram channel](https://github.com/vercel/eve/blob/main/docs/channels/telegram.mdx), and [Eve sessions](https://github.com/vercel/eve/blob/main/docs/concepts/sessions-runs-and-streaming.md). Upstream may differ from the installed version.

Publication destination confirmed by Sandon: the repository's GitHub Issues with the ready-for-agent label. This is a design spec, not an implemented or deployed feature.
