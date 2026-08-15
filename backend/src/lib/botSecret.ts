import crypto from "crypto";

// Internal secret shared only between the Express API and the Telegram bot,
// both of which run in this same process. Prevents third parties from
// minting sessions for an arbitrary telegramId via the telegram-* auth routes.
export const BOT_INTERNAL_SECRET =
  process.env.BOT_INTERNAL_SECRET || crypto.randomBytes(24).toString("hex");
