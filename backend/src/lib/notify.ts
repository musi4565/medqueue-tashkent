import { prisma } from "./prisma";
import { emitToUser } from "../socket";
import { sendTelegramMessage } from "../telegram/bot";

export async function notifyUser(userId: string, message: string, type: string) {
  const notif = await prisma.notification.create({
    data: { userId, message, type },
  });

  emitToUser(userId, "notification:new", notif);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramId: true },
  });
  if (user?.telegramId) {
    sendTelegramMessage(user.telegramId, message).catch((err) =>
      console.error("telegram notify error", err)
    );
  }

  return notif;
}
