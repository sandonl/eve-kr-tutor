import assert from "node:assert/strict";
import { test } from "node:test";
import { POST, type RouteHandlerArgs } from "eve/channels";
import { telegramChannel, type TelegramChannelState } from "eve/channels/telegram";
import { withTelegramClearCommand } from "../agent/lib/telegram_clear.js";

function setup(allowedUserId: string | undefined = "123") {
  const cleared: string[] = [];
  const replies: string[] = [];
  let forwarded = 0;
  const unexpected = () => { throw new Error("Must not start a model turn or use other session operations"); };
  const context: RouteHandlerArgs<TelegramChannelState> = {
    from: (address) => ({
      send: unexpected, respond: unexpected, cancel: unexpected,
      compact: unexpected, reset: unexpected,
      clear: async () => {
        cleared.push(address);
        return { status: "accepted", sessionId: "existing-session" };
      },
    }),
    resolveSession: unexpected, attachSession: unexpected, to: unexpected,
    params: {}, requestIp: null, waitUntil: unexpected,
  };
  const native = telegramChannel();
  const channel = withTelegramClearCommand({
    ...native,
    routes: [POST<TelegramChannelState>("/eve/v1/telegram", async () => {
      forwarded++;
      return new Response("native handler");
    })],
  }, {
    allowedUserId, botUsername: "tutor_bot",
    credentials: { webhookSecretToken: "test-secret", botToken: "test-token" },
    api: {
      fetch: async (_url, init) => {
        replies.push(String(init?.body));
        return Response.json({ ok: true, result: { message_id: 99 } });
      },
    },
  });
  async function send(text: string, userId = 123, chatType = "private", secret = "test-secret") {
    const route = channel.routes[0];
    if (route.transport === "websocket") throw new Error("Expected HTTP");
    return route.handler(new Request("https://example.com/eve/v1/telegram", {
      method: "POST",
      headers: { "X-Telegram-Bot-Api-Secret-Token": secret },
      body: JSON.stringify({ update_id: 1, message: {
        message_id: 2, date: 1, text,
        chat: { id: 123, type: chatType },
        from: { id: userId, is_bot: false, first_name: "Learner" },
      } }),
    }), context);
  }
  return { send, cleared, replies, forwarded: () => forwarded };
}

test("/clear and targeted /clear clear the chat without invoking the agent", async () => {
  for (const command of ["/clear", "/clear@tutor_bot"]) {
    const app = setup();
    assert.equal((await app.send(command)).status, 200);
    assert.deepEqual(app.cleared, ["123::"]);
    assert.equal(app.forwarded(), 0);
    assert.equal(app.replies.length, 1);
    assert.match(app.replies[0], /Supermemory/);
  }
});

test("clear rejects forged webhooks, other users, groups and missing allowlists", async () => {
  const app = setup();
  assert.equal((await app.send("/clear", 123, "private", "wrong")).status, 401);
  await app.send("/clear", 456);
  await app.send("/clear", 123, "group");
  assert.deepEqual(app.cleared, []);
  assert.deepEqual(app.replies, []);
  assert.equal(app.forwarded(), 0);
  const unconfigured = setup("");
  await unconfigured.send("/clear");
  assert.deepEqual(unconfigured.cleared, []);
});

test("ordinary messages and other commands retain native Telegram handling", async () => {
  const app = setup();
  for (const text of ["sentence mine", "/clear@another_bot", "explain /clear", "/clear later"]) {
    assert.equal(await (await app.send(text)).text(), "native handler");
  }
  assert.equal(app.forwarded(), 4);
  assert.deepEqual(app.cleared, []);
});
