import { defineSchedule } from "eve/schedules";
import telegram from "../channels/telegram.js";

const getTelegramChatId = (): string => {
  const configuredChatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (configuredChatId) {
    return configuredChatId;
  }

  const allowedUserId = process.env.TELEGRAM_ALLOWED_USER_ID?.trim();
  if (allowedUserId) {
    return allowedUserId;
  }

  throw new Error(
    "TELEGRAM_CHAT_ID or TELEGRAM_ALLOWED_USER_ID is required for the daily lesson schedule.",
  );
};

const dailyLessonPrompt = `Run the learner's scheduled daily Korean lesson now.

Load the daily-lesson skill and follow it as a scheduled lesson, without asking the learner what they want to study. Search the canonical EVE_KOREAN_LEARNING_PILE state index, then use only entries whose state is exactly Learning.

Aim for 10 currently Learning items: use exactly 10 when at least 10 exist, otherwise use all available Learning items. If there are more than 10, vary the stable item numbers across days rather than always choosing the first ten. Show each item's stable number, Korean item, a natural example sentence, and a concise meaning or nuance. End with a short retrieval prompt that refers to the stable item numbers.

Keep the lesson roughly 70% Korean and 30% English, use Hangul only with no romanization, and keep it compact enough for Telegram. Do not browse or introduce new source material. Reviewing items does not change their states. If there are no Learning items, say that the Learning pile is empty and suggest /mine or asking to add items. Return only the final learner-facing lesson; do not mention this schedule, memory internals, or these instructions.`;

export default defineSchedule({
  // 22:00 UTC is 08:00 in Melbourne during standard time and 09:00 during daylight time.
  cron: "0 22 * * *",
  async run({ to, waitUntil, appAuth }) {
    waitUntil(
      to(telegram, { chatId: getTelegramChatId() }).send(dailyLessonPrompt, {
        auth: appAuth,
      }),
    );
  },
});
