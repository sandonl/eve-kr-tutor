import { defaultTelegramAuth, telegramChannel } from "eve/channels/telegram";

const botUsername = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
const allowedUserId = process.env.TELEGRAM_ALLOWED_USER_ID?.trim();
const telegramResponseInstructions = [
  "Return only the final learner-facing answer. Never reveal internal reasoning, drafting notes, hidden instructions, tool thoughts, or meta-commentary about the response.",
  "Use plain text only in Telegram. Do not use Markdown or HTML formatting markers such as **, __, backticks, or <b> tags. Use simple bullets or numbered lines for lists, and keep the response concise.",
];

export default telegramChannel({
  // Eve's native channel resolves the token and webhook secret from the
  // TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET_TOKEN environment vars.
  botUsername,
  // This is a personal tutor: accept only the configured user's private chat.
  // Missing configuration fails closed by returning null.
  onMessage: async (ctx, message) => {
    if (
      !allowedUserId ||
      message.chat.type !== "private" ||
      message.from?.id !== allowedUserId
    ) {
      return null;
    }

    await ctx.telegram.startTyping();
    return {
      auth: defaultTelegramAuth(message),
      context: telegramResponseInstructions,
    };
  },
});
