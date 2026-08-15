import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";

const router = Router();

router.post("/register", async (req, res) => {
  const { name, phone, email, password } = req.body ?? {};
  if (!name || !phone || !email || !password) {
    return res.status(400).json({ error: "Barcha maydonlar to'ldirilishi shart" });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Bu email allaqachon ro'yxatdan o'tgan" });
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, phone, email, password: hashed },
  });
  const token = signToken(user.id);
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, phone: user.phone, email: user.email },
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email va parol talab qilinadi" });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Email yoki parol noto'g'ri" });
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Email yoki parol noto'g'ri" });
  }
  const token = signToken(user.id);
  res.json({
    token,
    user: { id: user.id, name: user.name, phone: user.phone, email: user.email },
  });
});

router.get("/me", async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  try {
    const { verifyToken } = await import("../lib/jwt");
    const { userId } = verifyToken(header.slice(7));
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, phone: true, email: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    res.json(user);
  } catch {
    res.status(401).json({ error: "Token yaroqsiz" });
  }
});

export default router;
