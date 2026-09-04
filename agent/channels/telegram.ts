import { defaultTelegramAuth, telegramChannel } from "eve/channels/telegram";

const botUsername = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
const allowedUserId = process.env.TELEGRAM_ALLOWED_USER_ID?.trim();

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
    return { auth: defaultTelegramAuth(message) };
  },
});
