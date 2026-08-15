import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/:id", async (req: AuthRequest, res) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: req.params.id },
    include: { doctor: true, clinic: true, queue: true },
  });
  if (!appointment || appointment.userId !== req.userId) {
    return res.status(404).json({ error: "Navbat topilmadi" });
  }
  res.json(appointment);
});

export default router;
