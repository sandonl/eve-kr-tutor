# Korean language tutor

A small Eve agent for practising Korean. Local development and the Vercel deployment use Gemini 3.5 Flash through Vercel AI Gateway. Supermemory provides learning context that can survive across conversations.

## Architecture

```text
learner → Eve session → Gemini 3.5 Flash
                    └→ Supermemory MCP
                         ├→ search_memory (automatic)
                         └→ add_memory (automatic)
```

Eve owns the conversation, tools, approvals, and session history. AI Gateway supplies the Gemini model route. Supermemory is a separate long-term memory service.

## Setup

Eve requires Node.js 24. Bun is the package manager, while Node.js remains the runtime Eve requires. This repository includes `.nvmrc`:

```sh
nvm install
nvm use
bun install
```

Local development uses Gemini Flash through AI Gateway. Add an AI Gateway key to `.env.local` (the key is already listed in `.env.example`):

```sh
AI_GATEWAY_API_KEY=your-vercel-ai-gateway-key
```

Create a Supermemory API key, then copy the example environment file:

```sh
cp .env.example .env
```

Replace `sm_your_api_key_here` in `.env`. The key stays in the trusted Eve runtime and is not shown to the model. `SUPERMEMORY_PROJECT_ID` is optional. Vercel production needs this key in the project's Production environment.

### Telegram (optional)

The Telegram channel is already wired as a native Eve channel. Create a bot with [@BotFather](https://t.me/BotFather), then add these values to `.env` (or `.env.local`):

```sh
TELEGRAM_BOT_TOKEN=123456:your-bot-token
TELEGRAM_BOT_USERNAME=your_bot
TELEGRAM_ALLOWED_USER_ID=123456789
TELEGRAM_WEBHOOK_SECRET_TOKEN=choose-a-random-secret
```

`TELEGRAM_ALLOWED_USER_ID` keeps this personal tutor private: only that numeric Telegram user ID can use a private chat, and group messages are ignored. To find your ID before setting the webhook, send `/start` to your bot and inspect the `message.from.id` value returned by:

```sh
curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates"
```

Telegram delivers messages to a public HTTPS webhook. After deploying and adding the allowlist value, register the Eve route once:

```sh
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-agent.example.com/eve/v1/telegram","secret_token":"'"${TELEGRAM_WEBHOOK_SECRET_TOKEN}"'","allowed_updates":["message","callback_query"]}'
```

For local testing, expose `bun run dev` through an HTTPS tunnel and use that tunnel URL in `setWebhook`; Telegram cannot deliver webhooks to `localhost`. Send `/start` to the bot before expecting a scheduled digest—the Bot API does not let bots initiate a new private chat.

## Run

```sh
bun run check
bun run dev
```

Try:

1. `카페에서 주문하는 상황으로 자연스럽게 대화해 보자.`
2. `내 표현을 더 자연스럽게 고쳐 줘.`
3. `/daily-lesson` to review current Learning words with example sentences.
4. `/sentence-mine` to find a few source-linked, everyday Korean examples.
5. `Remember the new words we covered today so you don't teach them as new next time.`
6. Start another Eve session and ask: `Choose some useful vocabulary that we have not covered before.`

Compact Supermemory writes are automatically approved for this private tutor. The current Learning pile lives in one canonical `EVE_KOREAN_LEARNING_PILE` record, which daily lessons can paginate and update as states change; sentence mining uses the learner's saved 2k frequency-list preference as a soft familiarity filter.

## Project shape

```text
agent/
├── agent.ts                    subscription-backed model and limits
├── instructions.md             tutor behaviour and memory policy
├── channels/eve.ts             local TUI and HTTP channel
├── channels/telegram.ts        Telegram webhook channel
├── connections/supermemory.ts  hosted Supermemory MCP connection
├── skills/daily-lesson/        review current Learning items with examples
├── skills/sentence-mine/       source-linked Korean sentence mining
└── tools/                       dangerous defaults disabled; web and YouTube excerpt tools enabled for sentence mining
evals/                            behavioural checks
docs/eve-deep-dive.md            notes on Eve's architecture
```

`youtube_video_excerpt` sends a public YouTube video to Gemini Flash through AI Gateway and returns a few short Korean on-screen caption lines with approximate timestamps, or an explicit unavailable result. Treat those lines as Gemini video excerpts rather than verified original-caption quotes or audio transcription. The sentence-mining skill discovers videos from the learner's preferred sources and moves to another source when an excerpt is unavailable or looks like metadata. A Naver article remains a clearly labeled written alternative.

## Commands

```sh
bun run dev      # Start the interactive tutor
bun run info     # Show the capabilities Eve discovered
bun run check    # Type-check and validate discovery
bun test         # Run deterministic YouTube video-excerpt contract tests
bun run eval     # Run behavioural evals; consumes subscription usage
bun run eval -- --tag youtube --url http://127.0.0.1:2000/
bun run build    # Build the agent
```

The YouTube evals are tagged `network` because they call YouTube and the model. Run them against a running `bun run dev` server, or let `eve eval` start one when no server is already running. Use `--exclude-tag network` for a local deterministic-only eval run.

`agent/agent.ts` and the YouTube video-excerpt tool both use `google/gemini-3.5-flash-lite` through Vercel AI Gateway. The excerpt tool is a small structured-output call so sentence mining can reject non-Korean or unavailable video results and fall back cleanly.
