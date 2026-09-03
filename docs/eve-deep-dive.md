# Eve deep dive

This guide is a map of Eve rather than a copy of its API reference. Its goal is to make the framework's boundaries understandable before we build on it.

> Source note: Eve is in public beta and is moving quickly. Treat the documentation bundled with the installed package at `node_modules/eve/docs` as the version-matched source of truth. The links below point to the current upstream documentation. ([Eve README](https://github.com/vercel/eve#beta-terms), [Getting started](https://github.com/vercel/eve/blob/main/docs/getting-started.mdx))

## The short version

Eve is a filesystem-first TypeScript framework for durable AI agents. You describe an agent with conventional files, and Eve discovers and compiles those files into a runnable service. The framework supplies the model/tool loop, durable sessions, sandboxed computing, human pauses, channels, schedules, delegation, evaluation, and telemetry. ([Eve README](https://github.com/vercel/eve), [Introducing Eve](https://vercel.com/blog/introducing-eve))

The simplest useful mental model is:

```text
agent directory
      │ discovered and compiled by Eve
      ▼
trusted app runtime ───── model provider
      │
      ├── tools, connections, state, workflow, channels
      │
      └── controlled bridge ───── isolated per-session sandbox
                                     /workspace + processes
```

The distinction that matters most is **trusted integration code versus untrusted model-controlled compute**. Tool implementations, model calls, secrets, connections, state, and durable orchestration run in the application runtime. Shell commands and workspace file operations are proxied into an isolated sandbox. ([Security model](https://github.com/vercel/eve/blob/main/docs/concepts/security-model.md), [Execution model](https://github.com/vercel/eve/blob/main/docs/concepts/execution-model-and-durability.mdx))

## 1. The filesystem is the API

A minimal root agent needs only `agent/instructions.md`. Add slots when the behavior actually needs them:

```text
my-agent/
├── package.json
├── agent/
│   ├── agent.ts                 # model and runtime configuration
│   ├── instructions.md          # always-on identity and behavior
│   ├── instrumentation.ts       # OpenTelemetry configuration
│   ├── tools/                   # typed actions implemented by us
│   ├── skills/                  # procedures loaded into context on demand
│   ├── connections/             # external MCP/OpenAPI capabilities
│   ├── memory/                  # context that can outlive a session
│   ├── hooks/                   # lifecycle/event subscribers
│   ├── lib/                     # shared TypeScript, never mounted
│   ├── sandbox/
│   │   ├── sandbox.ts           # backend and lifecycle configuration
│   │   └── workspace/           # initial files copied to /workspace
│   ├── channels/                # HTTP, web chat, Slack, etc.
│   ├── schedules/               # cron-triggered work
│   └── subagents/               # specialist child agents
└── evals/                       # tests sit beside agent/, not inside it
```

Names come from paths: `tools/get_weather.ts` becomes `get_weather`, `skills/research.md` becomes `research`, and `subagents/reviewer/agent.ts` becomes `reviewer`. This convention removes a registry/config layer, but also makes placement meaningful. `eve info` shows what Eve actually discovered, while `.eve/` contains discovery, diagnostics, compiled-manifest, and module-map artifacts. ([Getting started: project layout](https://github.com/vercel/eve/blob/main/docs/getting-started.mdx#project-layout), [Observability: debugging](https://github.com/vercel/eve/blob/main/docs/guides/instrumentation.md#debugging))

Root-only slots include channels, schedules, and instrumentation. A declared subagent gets its own agent-shaped directory but does not inherit the root's authored slots. ([Getting started: agent files](https://github.com/vercel/eve/blob/main/docs/getting-started.mdx#agent-files-and-directories), [Subagent isolation](https://github.com/vercel/eve/blob/main/docs/subagents/index.mdx#the-isolation-boundary))

## 2. The harness and agent loop

The built-in harness repeatedly calls the model, executes requested tools, appends results, and calls the model again until it produces a response. It also manages context compaction. By default, compaction begins near 90% of the model context window and summarizes older work into a checkpoint while preserving framework state such as the todo list. ([Default harness](https://github.com/vercel/eve/blob/main/docs/concepts/default-harness.md))

One durable conversation is a **session**. One incoming message and the work it triggers is a **turn**. One model call plus its tool calls is a durable **step**:

```text
session
  ├── turn 1
  │    ├── step 1: model → tool calls
  │    └── step 2: model → final response
  └── turn 2
       └── ...
```

Eve runs each turn as a Workflow SDK workflow and checkpoints at step boundaries. A completed step is replayed from its recorded result after a restart; an interrupted step may execute again. Consequently, an external side effect still needs an upstream idempotency key or application-level deduplication. Human approval decides whether an action is authorized; it is not a substitute for idempotency after an ambiguous network result. ([Execution model: sessions, turns, and steps](https://github.com/vercel/eve/blob/main/docs/concepts/execution-model-and-durability.mdx#sessions-turns-and-steps), [Tools: failures and replay](https://github.com/vercel/eve/blob/main/docs/tools/overview.mdx#when-a-tool-throws))

When the agent waits for an approval, an OAuth callback, a question response, a timer, or a child agent, the workflow can park without holding compute. It resumes from durable state later. Locally, workflow data defaults to `.eve/.workflow-data`; Vercel deployments use Vercel Workflow. Self-hosters can select a compatible Workflow “world,” but that integration is currently under Eve's experimental configuration. ([Execution model: parked work](https://github.com/vercel/eve/blob/main/docs/concepts/execution-model-and-durability.mdx#parked-work), [Self-hosting: workflow state](https://github.com/vercel/eve/blob/main/docs/guides/deployment/self-hosting.md#persist-workflow-state))

## 3. Models and providers

`agent/agent.ts` uses `defineAgent`. A string model ID routes through Vercel AI Gateway; alternatively, pass a `LanguageModel` from an AI SDK provider package to call that provider directly:

```ts
import { anthropic } from "@ai-sdk/anthropic";
import { defineAgent } from "eve";

export default defineAgent({
  model: anthropic("claude-opus-4-8"),
  reasoning: "high",
});
```

Dynamic model selection can run per session, turn, or step. Prefer the broadest stable scope because changing models makes prompt caching less effective. Runtime limits can cap input/output tokens and session lifetime; the default session lifetime is 30 days, and a root session has a large default input-token budget unless explicitly changed. ([Agent configuration: models](https://github.com/vercel/eve/blob/main/docs/agent-config.md#set-the-model), [Agent configuration: runtime limits](https://github.com/vercel/eve/blob/main/docs/agent-config.md#runtime-limits))

The framework is therefore provider-flexible, not provider-independent in every detail. Model capabilities, reasoning controls, web search, data handling, retention, and errors still depend on the selected provider and route.

## 4. Tools: typed actions in trusted code

An authored tool is application code the model may call. Its filename is its model-facing name, its description tells the model when to use it, and its input schema validates and types the request:

```ts
import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "Look up an order by its public order number.",
  inputSchema: z.object({ orderNumber: z.string().min(1) }),
  outputSchema: z.object({ status: z.string() }),
  async execute({ orderNumber }, ctx) {
    return { status: await lookupOrder(orderNumber, ctx.session.auth.current) };
  },
});
```

Zod, another Standard Schema implementation, or plain JSON Schema can define inputs. Zod and Standard Schema infer the `execute` input type; an optional output schema also checks and types the return. Tools run in the trusted application runtime, so they can import `lib/`, access environment variables, call APIs, and request the active sandbox through `ctx.getSandbox()`. Tool results must cross a durable JSON boundary, so return JSON-serializable data. ([Tools: define a tool](https://github.com/vercel/eve/blob/main/docs/tools/overview.mdx#define-a-tool), [Tools: context](https://github.com/vercel/eve/blob/main/docs/tools/overview.mdx#the-ctx-parameter))

Eve provides default tools including `bash`, `read_file`, `write_file`, `web_fetch`, `todo`, and conditionally `ask_question`, `agent`, `load_skill`, `connection_search`, and provider-supported `web_search`. The filesystem and shell tools are app-side proxies into the sandbox. Defaults occupy normal tool slots, so we can override one with a same-named file or remove it with `disableTool()`. Review and reduce this default surface before production. ([Built-in tools](https://github.com/vercel/eve/blob/main/docs/concepts/built-in-tools.md))

Use a **tool** for typed behavior we implement, a **connection** for tools exposed by an external MCP/OpenAPI service, and a **skill** for procedural instructions. Those are different security and context surfaces.

## 5. Sandbox and workspace

Each durable session gets a sandbox with a `/workspace` filesystem and processes. Only authored files under `agent/sandbox/workspace/**` seed that filesystem. Other agent source files remain outside it; `agent/lib/**`, for example, is application code only. ([Sandbox: seeding workspace](https://github.com/vercel/eve/blob/main/docs/sandbox.mdx#seeding-workspace), [Getting started: files available](https://github.com/vercel/eve/blob/main/docs/getting-started.mdx#files-available-in-the-sandbox))

Available backends are:

| Backend | Intended use | Important boundary |
| --- | --- | --- |
| Vercel Sandbox | Hosted deployment | Isolated microVM; supports domain policy and credential brokering |
| Docker | Local/self-hosted | Real container and binaries; network policy is only allow-all or deny-all |
| microsandbox | Local/self-hosted | Lightweight VM; closest local match to hosted sandbox |
| just-bash | Lightweight fallback | Simulated shell/filesystem, no real binaries, no network isolation |

`defaultBackend()` chooses hosted Vercel Sandbox on Vercel, then Docker, microsandbox, and finally just-bash locally. `bootstrap` prepares a reusable template; `onSession` applies per-session setup. The default egress policy is `allow-all`, so production agents should deliberately choose `deny-all` or an allow-list where open network access is unnecessary. ([Sandbox: backends](https://github.com/vercel/eve/blob/main/docs/sandbox.mdx#backends), [Sandbox: lifecycle](https://github.com/vercel/eve/blob/main/docs/sandbox.mdx#lifecycle), [Sandbox: network policy](https://github.com/vercel/eve/blob/main/docs/sandbox.mdx#network-policy))

The sandbox is persistent working space, not automatically a system of record. A backend can lose or replace physical sandbox state. Persist important artifacts elsewhere. Credential brokering can inject authentication at the sandbox firewall for approved domains without exposing secrets to the sandbox process. ([Sandbox: delete and replacement behavior](https://github.com/vercel/eve/blob/main/docs/sandbox.mdx#delete-a-sandbox), [Security model: credential brokering](https://github.com/vercel/eve/blob/main/docs/concepts/security-model.md#credential-brokering))

## 6. Skills: instructions on demand

A skill is a Markdown procedure following the `SKILL.md` convention. Eve gives the model skill names and descriptions, then exposes `load_skill`; the complete instructions enter context only when relevant. This progressive disclosure keeps optional playbooks out of every prompt. Loading a skill does **not** grant a tool or a new execution capability. ([Skills: loading](https://github.com/vercel/eve/blob/main/docs/skills.mdx#how-loading-works))

Start with a flat Markdown file. Use a packaged `skills/<name>/SKILL.md` directory when the procedure needs references, assets, or scripts. Use `defineSkill` only for generated content or typed values. Skills are scoped to the agent that declares them, and community skills should be reviewed like executable supply-chain inputs before installation even when they are “only” instructions. ([Skills: Markdown and defineSkill](https://github.com/vercel/eve/blob/main/docs/skills.mdx#markdown-vs-defineskill), [Skills: community registry](https://github.com/vercel/eve/blob/main/docs/skills.mdx#find-and-install-community-skills))

## 7. State and memory

`defineState` creates typed, session-scoped durable working memory. It is a good fit for a turn budget, current plan, glossary, or checklist. Values survive steps, turns, restarts, and redeploys, but live only for that session and are never shared with subagents. Declare the handle once at module scope, then use `get()` and `update()` inside Eve-managed runtime code. ([State](https://github.com/vercel/eve/blob/main/docs/concepts/state.md))

Eve's separate memory slots are for context that should outlive a session. A provider owns storage, retrieval, and capture; Eve owns slot naming, trusted scope resolution, and when recall/capture happens. Recalled records enter context as attributed user-role messages rather than system instructions. Use a normal connection instead when data should be queried explicitly rather than recalled automatically. ([Memory overview](https://github.com/vercel/eve/blob/main/docs/memory/overview.mdx))

In other words:

```text
conversation history = what happened in this session
defineState          = structured working state for this session
memory provider      = scoped context reusable across sessions
sandbox files        = working artifacts, not guaranteed permanent storage
external database    = application-owned source of truth
```

## 8. Human approval and questions

Tool approval policies can be `never()` (the default), `once()`, `always()`, or a custom policy based on tool input and authenticated session context. A separate response policy can decide whether the authenticated responder is allowed to approve a particular request. Sensitive tools should validate both what is being attempted and who may authorize it. ([Human-in-the-loop: approvals](https://github.com/vercel/eve/blob/main/docs/tools/human-in-the-loop.md#approvals), [Approval response authorization](https://github.com/vercel/eve/blob/main/docs/tools/human-in-the-loop.md#authorizing-approval-responses))

The built-in `ask_question` tool uses the same protocol. Eve emits `input.requested`, parks the workflow at `session.waiting`, then resumes after a client or channel supplies the matching answer. This is a durable control-flow primitive, not just a UI dialog. ([Human-in-the-loop](https://github.com/vercel/eve/blob/main/docs/tools/human-in-the-loop.md))

The safety rule is simple: authentication answers “who is calling?”, authorization answers “may they do this?”, approval answers “does a human consent now?”, and idempotency answers “will this side effect happen at most once?” Eve supports all four concerns, but they are not interchangeable.

## 9. Channels and schedules

A channel adapts an external surface to Eve. It normalizes input, maps the platform conversation to a durable session address, and controls response delivery. The default Eve HTTP channel powers the local terminal, browser clients, and direct API calls. First-class and custom options cover web UI, MCP, Slack, Discord, Teams, Telegram, Twilio, GitHub, Linear, and other adapters. Subagents cannot declare channels. ([Channels overview](https://github.com/vercel/eve/blob/main/docs/channels/overview.mdx))

Incoming messages default to `turnPolicy: "steer"`: a new accepted message durably buffers a replacement and cooperatively cancels the active turn. `"queue"` waits for the active turn to settle. Already streamed output and completed side effects are not rolled back, another reason side effects need careful design. ([Channels: overlapping messages](https://github.com/vercel/eve/blob/main/docs/channels/overview.mdx#overlapping-messages))

A root schedule has a five-field cron expression and either:

- Markdown/task mode: starts a fresh fire-and-forget session and cannot wait for human input.
- A TypeScript `run` handler: can choose a channel target, send work as an app or user principal, and park durably.

`eve dev` does not run cron automatically; it provides a development dispatch route. Vercel compiles schedules to Vercel Cron jobs, while `eve start` runs Nitro's scheduler for self-hosted builds. Cron evaluation on Vercel is UTC. ([Schedules](https://github.com/vercel/eve/blob/main/docs/schedules.mdx))

## 10. Subagents

Eve has two delegation mechanisms:

1. The root-only built-in `agent` tool creates or continues a fresh copy of the root agent. It shares the root's tools, connections, auth, and sandbox, but starts with fresh conversation history and state.
2. A declared `agent/subagents/<name>/` specialist has its own model, prompt, tools, skills, connections, state, and normally its own sandbox. It inherits nothing from the root's authored slots.

The parent sends all needed context in a `message`; the child never sees parent history implicitly. Several child calls emitted together run concurrently. A child's writes are visible immediately only where a sandbox is shared. Delegation is not itself an approval boundary, so sensitive tools must retain their own controls. ([Subagents: built-in agent](https://github.com/vercel/eve/blob/main/docs/subagents/index.mdx#the-built-in-agent-tool), [Subagents: declared specialists](https://github.com/vercel/eve/blob/main/docs/subagents/index.mdx#declared-subagents))

Use a skill when the same agent identity merely needs an optional procedure. Use a subagent when work benefits from a fresh context, narrower capabilities, genuine parallelism, or a specialist identity. This keeps agent architecture from turning into unnecessary organizational theatre.

## 11. Evals and observability

Evals are `.eval.ts` files under app-root `evals/`. They drive the same HTTP/session surface users exercise, then inspect responses, tool calls, events, and multi-turn behavior. Assertions can be hard gates or soft scores; deterministic checks and a separate LLM judge are both supported. `mockModel` lets runtime tests exercise predictable model/tool loops without provider calls. ([Evals overview](https://github.com/vercel/eve/blob/main/docs/evals/overview.mdx))

A useful baseline is small and behavioral: prove the run succeeds, the important tool is or is not called, and the user-visible outcome is correct. Avoid tests that simply restate mocked data. Run `eve eval --strict` in CI when soft thresholds should also block a change. ([Evals: baseline](https://github.com/vercel/eve/blob/main/docs/evals/overview.mdx#a-good-baseline), [Running evals](https://github.com/vercel/eve/blob/main/docs/evals/running.mdx))

Observability has three layers:

- Automatic workflow run tags connect sessions, turns, subagents, models, and token usage.
- OpenTelemetry spans capture the turn → model step → tool-call tree and can export to an OTel-compatible backend.
- Runtime-context events add trusted per-step attributes.

Inputs and outputs are not recorded in authored OTel spans by default. Enabling them is a data-export decision, not merely a debugging toggle. Without custom instrumentation, `eve dev` records local traces to disk; adding `instrumentation.ts` replaces that local setup with ours. ([Observability](https://github.com/vercel/eve/blob/main/docs/guides/instrumentation.md))

## 12. Deployment

Eve can deploy to Vercel or run as a Node service. Vercel provides the web runtime, Vercel Workflow, Vercel Sandbox, Cron, and hosted observability. Self-hosting produces a Nitro Node server and makes us responsible for persistent workflow storage, a sandbox backend, process operation, TLS, routes, schedules, and logs. Both `/eve/` and `/.well-known/workflow/` must reach a self-hosted service or workflow callbacks will stall. ([Deployment overview](https://github.com/vercel/eve/blob/main/docs/guides/deployment/overview.md), [Vercel deployment](https://github.com/vercel/eve/blob/main/docs/guides/deployment/vercel.mdx), [Self-hosting](https://github.com/vercel/eve/blob/main/docs/guides/deployment/self-hosting.md))

This portability is at the agent-source level, not “zero infrastructure everywhere.” Vercel supplies first-party adapters automatically; self-hosting means choosing and operating equivalent workflow and sandbox infrastructure.

## 13. Security boundaries to keep visible

Before production, verify these explicit decisions:

- Replace scaffold `placeholderAuth()`; Eve routes fail closed unless an auth policy admits the request.
- Authenticate channel webhooks from their raw bodies with constant-time signature checks. Never trust a body-supplied user identity before verification.
- Keep provider and integration secrets in the app runtime. Do not write them to prompts, tool results, sandbox environment, or compiled artifacts.
- Minimize tool output because it becomes model-visible and durable session data.
- Restrict or disable default shell, file, fetch, and delegation tools that the use case does not need.
- Give connection tokens least privilege and constrain sandbox egress.
- Put authorization and approval at every path that can reach a sensitive action, including subagents and schedules.
- Make non-idempotent side effects replay-safe.
- Review model, channel, connection, memory, telemetry, and eval providers for data handling and retention.

These follow directly from Eve's documented trust model and pre-production checklist. Eve supplies boundaries and mechanisms, but the deployer chooses the policy. ([Security model](https://github.com/vercel/eve/blob/main/docs/concepts/security-model.md), [Responsible use](https://github.com/vercel/eve/blob/main/docs/responsible-use.md))

## 14. Maturity and adoption judgment

Eve is explicitly beta: APIs, documentation, and behavior may change before general availability. It requires Node.js 24 or newer. Some capabilities are marked experimental, including custom Workflow-world selection and the model-authored `Workflow` orchestration tool. Hosted observability features can also require team enablement. ([Eve beta terms](https://github.com/vercel/eve#beta-terms), [Getting started: prerequisites](https://github.com/vercel/eve/blob/main/docs/getting-started.mdx#prerequisites), [Built-in Workflow tool](https://github.com/vercel/eve/blob/main/docs/concepts/built-in-tools.md#workflow-tool))

That does not make it unsuitable for learning. It means we should pin the package version, commit generated files, consult `node_modules/eve/docs` before copying examples from the web, keep the first project narrow, and expect small migrations while the framework settles.

## Recommended learning sequence

Build one agent in layers, keeping the same domain throughout so each layer teaches one concept:

1. **Instructions and one read-only tool.** Learn discovery, the terminal UI, Zod input typing, the tool loop, and `eve info`.
2. **Sandbox analysis.** Seed a small dataset into `/workspace`; observe `read_file`, `write_file`, and `bash`, then disable one default tool to see the capability surface change.
3. **Session state.** Add a meaningful `defineState` constraint such as a query budget and prove that it survives turns.
4. **Human approval.** Add one genuine side effect behind `always()` plus a stable idempotency key. Inspect the waiting and resume events.
5. **One packaged skill.** Move a long optional procedure out of always-on instructions and watch `load_skill` bring it in only when relevant.
6. **Focused evals.** Test a read-only path, the budget invariant, and the approval boundary. Use a deterministic model fixture for runtime mechanics and a real model only where behavior genuinely depends on one.
7. **A declared specialist.** Add one subagent with a narrower tool surface; compare it with the built-in root copy and inspect its child session.
8. **One channel.** Add web chat or Slack only after the HTTP/TUI behavior is stable. Treat route auth and webhook verification as part of the feature.
9. **One schedule.** Trigger it manually in development before deploying cron. Store cross-run state outside session state.
10. **Observability and deployment.** Inspect local traces, add OTel only if useful, then deploy after tightening auth, default tools, egress, secrets, and retention choices.

Do not begin with multiple channels, remote agents, dynamic capabilities, memory vendors, or the experimental `Workflow` tool. Those are valuable once a real requirement makes their extra boundary worth understanding.

## Questions to keep asking while building

- What information is always-on instruction, optional skill, session state, long-term memory, or source-of-truth data?
- Does this capability belong in trusted tool code or in the untrusted sandbox?
- Can this step execute twice after an interruption?
- Who authenticated this turn, who may authorize the action, and who may answer the approval?
- Which data leaves through the model, channel, tool, connection, sandbox network, memory, or telemetry provider?
- Does this need another agent, or merely a clearer tool or skill?
- What observable behavior would prove this still works after a prompt or model change?

If those answers stay simple, the agent will stay simple too.
