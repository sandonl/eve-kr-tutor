import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { ScheduleHandlerArgs } from "eve/schedules";
import dailyLessonSchedule from "../agent/schedules/daily-lesson.js";

const originalChatId = process.env.TELEGRAM_CHAT_ID;
const originalAllowedUserId = process.env.TELEGRAM_ALLOWED_USER_ID;

const restoreEnvironment = (): void => {
  if (originalChatId === undefined) {
    delete process.env.TELEGRAM_CHAT_ID;
  } else {
    process.env.TELEGRAM_CHAT_ID = originalChatId;
  }

  if (originalAllowedUserId === undefined) {
    delete process.env.TELEGRAM_ALLOWED_USER_ID;
  } else {
    process.env.TELEGRAM_ALLOWED_USER_ID = originalAllowedUserId;
  }
};

afterEach(restoreEnvironment);

const runScheduleWithFakeDelivery = async (
  expectedChatId: string,
): Promise<{ message: string; auth: ScheduleHandlerArgs["appAuth"] }> => {
  let delivery: Promise<unknown> | undefined;
  let sentMessage: string | undefined;
  let sentAuth: ScheduleHandlerArgs["appAuth"] | undefined;
  const appAuth = {
    attributes: {},
    authenticator: "test",
    principalId: "test",
    principalType: "runtime",
  } satisfies ScheduleHandlerArgs["appAuth"];
  const to: ScheduleHandlerArgs["to"] = (_channel, target) => {
    assert.deepEqual(target, { chatId: expectedChatId });
    return {
      send: async (message, options) => {
        sentMessage = typeof message === "string" ? message : "";
        assert.equal(options.auth, appAuth);
        assert.equal(options.turnPolicy, "queue");
        sentAuth = options.auth ?? undefined;
        return undefined as never;
      },
    };
  };

  const waitUntil: ScheduleHandlerArgs["waitUntil"] = (task) => {
    delivery = task;
  };

  if (dailyLessonSchedule.run === undefined) {
    throw new Error("The daily lesson schedule must use a run handler.");
  }

  await dailyLessonSchedule.run({ to, waitUntil, appAuth });
  assert.ok(delivery);
  await delivery;
  assert.equal(typeof sentMessage, "string");
  assert.equal(sentAuth, appAuth);

  return { message: sentMessage ?? "", auth: sentAuth ?? appAuth };
};

test("daily lesson schedule runs every day and sends a ten-item lesson prompt", async () => {
  process.env.TELEGRAM_CHAT_ID = "123456789";
  process.env.TELEGRAM_ALLOWED_USER_ID = "123456789";

  const result = await runScheduleWithFakeDelivery("123456789");

  assert.equal(dailyLessonSchedule.cron, "0 22 * * *");
  assert.match(result.message, /Aim for 10 currently Learning items/);
  assert.match(result.message, /EVE_KOREAN_LEARNING_PILE/);
  assert.match(result.message, /stable item numbers/);
});

test("invalid or unauthorised destinations fail before any channel dispatch", async () => {
  const appAuth = {
    attributes: {}, authenticator: "test", principalId: "test", principalType: "runtime",
  };
  for (const [allowedUserId, chatId] of [
    ["", "123456789"], ["-123", ""], ["abc", ""], ["123456789", "987654321"],
  ]) {
    process.env.TELEGRAM_ALLOWED_USER_ID = allowedUserId;
    process.env.TELEGRAM_CHAT_ID = chatId;
    await assert.rejects(() => dailyLessonSchedule.run({
      appAuth,
      to: () => { throw new Error("Unexpected channel dispatch"); },
      waitUntil: () => { throw new Error("Unexpected background task"); },
    }), /TELEGRAM_(?:ALLOWED_USER_ID|CHAT_ID)/);
  }
});

test("daily lesson schedule can use the private allowlist as its Telegram destination", async () => {
  delete process.env.TELEGRAM_CHAT_ID;
  process.env.TELEGRAM_ALLOWED_USER_ID = "987654321";

  const result = await runScheduleWithFakeDelivery("987654321");

  assert.match(result.message, /daily Korean lesson/);
});
