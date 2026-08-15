import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  const labs = await prisma.labTest.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
  });
  res.json(labs);
});

router.get("/:id", async (req: AuthRequest, res) => {
  const lab = await prisma.labTest.findUnique({ where: { id: req.params.id } });
  if (!lab || lab.userId !== req.userId) {
    return res.status(404).json({ error: "Tahlil topilmadi" });
  }
  res.json(lab);
});

export default router;
