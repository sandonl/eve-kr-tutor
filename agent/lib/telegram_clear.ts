import {
  parseTelegramUpdate,
  sendTelegramMessage,
  telegramContinuationToken,
  verifyTelegramRequest,
  type TelegramChannel,
  type TelegramChannelConfig,
} from "eve/channels/telegram";

// Keep native Telegram delivery, but handle /clear before a model turn starts.
export function withTelegramClearCommand(
  channel: TelegramChannel,
  config: Pick<TelegramChannelConfig, "botUsername" | "credentials" | "api"> & {
    allowedUserId: string | undefined;
  },
): TelegramChannel {
  return {
    ...channel,
    routes: channel.routes.map((route) => {
      if (route.transport === "websocket" || route.method !== "POST") return route;
      return {
        ...route,
        async handler(request, context) {
          let body: string;
          try {
            body = await verifyTelegramRequest(request.clone(), {
              secretToken: config.credentials?.webhookSecretToken,
              webhookVerifier: config.credentials?.webhookVerifier,
            });
          } catch {
            return new Response("unauthorized", { status: 401 });
          }
          let update;
          try {
            update = parseTelegramUpdate(JSON.parse(body));
          } catch {
            return new Response("ok");
          }
          if (update?.kind !== "message") return route.handler(request, context);
          const message = update.message;
          const command = message.text.trim();
          const isClear = command === "/clear" ||
            (config.botUsername !== undefined &&
              command.toLowerCase() === `/clear@${config.botUsername.toLowerCase()}`);
          if (!isClear) return route.handler(request, context);
          if (!config.allowedUserId || message.chat.type !== "private" ||
              message.from?.isBot || message.from?.id !== config.allowedUserId) {
            return new Response("ok");
          }

          const result = await context.from(telegramContinuationToken({
            chatId: message.chat.id,
            messageThreadId: message.messageThreadId,
          })).clear();
          // Accepted means queued; an active turn finishes before context clears.
          await sendTelegramMessage({
            ...config.api,
            credentials: config.credentials,
            chatId: message.chat.id,
            body: {
              text: result.status === "accepted"
                ? "대화 초기화를 요청했어. 진행 중인 답변이 있다면 끝난 뒤 초기화돼. Supermemory의 선호도와 학습 목록은 그대로야."
                : "초기화할 대화가 없어. 새 메시지를 보내면 시작할 수 있어. Supermemory는 그대로야.",
              message_thread_id: message.messageThreadId,
            },
          });
          return new Response("ok");
        },
      };
    }),
  };
}
