import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { requireBotSecret } from "../middleware/botSecret";

const router = Router();

const LINK_CODE_TTL_MS = 10 * 60 * 1000;

function publicUser(user: { id: string; name: string; phone: string; email: string }) {
  return { id: user.id, name: user.name, phone: user.phone, email: user.email };
}

// called by the website (authenticated) to generate a short code the user
// then sends to the bot as "/link <code>" to bind their Telegram account
router.post("/link-code", requireAuth, async (req: AuthRequest, res) => {
  await prisma.telegramLinkCode.deleteMany({ where: { userId: req.userId } });

  const code = crypto.randomInt(100000, 999999).toString();
  await prisma.telegramLinkCode.create({
    data: {
      code,
      userId: req.userId!,
      expiresAt: new Date(Date.now() + LINK_CODE_TTL_MS),
    },
  });

  res.json({ code, expiresInSeconds: LINK_CODE_TTL_MS / 1000 });
});

// called by the bot when the user sends "/link <code>"
router.post("/link", requireBotSecret, async (req, res) => {
  const { code, telegramId, telegramUsername } = req.body ?? {};
  if (!code || !telegramId) {
    return res.status(400).json({ error: "code va telegramId talab qilinadi" });
  }

  const linkCode = await prisma.telegramLinkCode.findUnique({ where: { code } });
  if (!linkCode || linkCode.expiresAt < new Date()) {
    return res.status(400).json({ error: "Kod noto'g'ri yoki muddati o'tgan" });
  }

  const existing = await prisma.user.findUnique({ where: { telegramId: String(telegramId) } });
  if (existing && existing.id !== linkCode.userId) {
    return res.status(409).json({ error: "Bu Telegram hisob boshqa akkauntga bog'langan" });
  }

  const user = await prisma.user.update({
    where: { id: linkCode.userId },
    data: { telegramId: String(telegramId), telegramUsername: telegramUsername ?? null },
  });
  await prisma.telegramLinkCode.delete({ where: { code } });

  const token = signToken(user.id);
  res.json({ token, user: publicUser(user) });
});

// called by the bot for a brand-new Telegram-only user (no website account yet)
router.post("/register", requireBotSecret, async (req, res) => {
  const { telegramId, telegramUsername, name, phone } = req.body ?? {};
  if (!telegramId || !name || !phone) {
    return res.status(400).json({ error: "telegramId, name va phone talab qilinadi" });
  }

  const existing = await prisma.user.findUnique({ where: { telegramId: String(telegramId) } });
  if (existing) {
    const token = signToken(existing.id);
    return res.json({ token, user: publicUser(existing) });
  }

  const randomPassword = crypto.randomBytes(16).toString("hex");
  const hashed = await bcrypt.hash(randomPassword, 10);
  const email = `tg${telegramId}@medqueue.uz`;

  const user = await prisma.user.create({
    data: {
      name,
      phone,
      email,
      password: hashed,
      telegramId: String(telegramId),
      telegramUsername: telegramUsername ?? null,
    },
  });

  const token = signToken(user.id);
  res.status(201).json({ token, user: publicUser(user) });
});

// called by the bot on /start (or after a restart) to mint a fresh session
// for an already-linked telegramId
router.post("/session", requireBotSecret, async (req, res) => {
  const { telegramId } = req.body ?? {};
  if (!telegramId) return res.status(400).json({ error: "telegramId talab qilinadi" });

  const user = await prisma.user.findUnique({ where: { telegramId: String(telegramId) } });
  if (!user) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });

  const token = signToken(user.id);
  res.json({ token, user: publicUser(user) });
});

export default router;
