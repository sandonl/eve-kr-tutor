# Korean language tutor

A small Eve agent for practising Korean. It uses the local Codex login for model access and Supermemory MCP for learning context that can survive across conversations.

## Architecture

```text
learner → Eve session → ChatGPT subscription model
                    └→ Supermemory MCP
                         ├→ search_memory (automatic)
                         └→ save/forget (requires approval)
```

Eve owns the conversation, tools, approvals, and session history. Codex supplies local model authentication. Supermemory is a separate long-term memory service.

## Setup

Eve requires Node.js 24. Bun is the package manager, while Node.js remains the runtime Eve requires. This repository includes `.nvmrc`:

```sh
nvm install
nvm use
bun install
```

The model uses the ChatGPT account connected to Codex:

```sh
codex login
codex login status
```

Create a Supermemory API key, then copy the example environment file:

```sh
cp .env.example .env
```

Replace `sm_your_api_key_here` in `.env`. The key stays in the trusted Eve runtime and is not shown to the model. `SUPERMEMORY_PROJECT_ID` is optional.

## Run

```sh
bun run check
bun run dev
```

Try:

1. `카페에서 주문하는 상황으로 자연스럽게 대화해 보자.`
2. `내 표현을 더 자연스럽게 고쳐 줘.`
3. `Remember the new words we covered today so you don't teach them as new next time.`
4. Start another Eve session and ask: `Choose some useful vocabulary that we have not covered before.`

The third prompt should pause before Supermemory writes anything. Future lessons search that memory before selecting new material.

## Project shape

```text
agent/
├── agent.ts                    subscription-backed model and limits
├── instructions.md             tutor behaviour and memory policy
├── channels/eve.ts             local TUI and HTTP channel
├── connections/supermemory.ts  hosted Supermemory MCP connection
├── skills/guided-lesson/       lesson procedure loaded on demand
└── tools/                       dangerous default tools disabled
evals/                            behavioural checks
docs/eve-deep-dive.md            notes on Eve's architecture
```

## Commands

```sh
bun run dev      # Start the interactive tutor
bun run info     # Show the capabilities Eve discovered
bun run check    # Type-check and validate discovery
bun run eval     # Run behavioural evals; consumes subscription usage
bun run build    # Build after selecting a deployable model
```

The `chatgpt()` model is intentionally local-only. Before deploying, switch `agent/agent.ts` to an AI Gateway or direct-provider model.
