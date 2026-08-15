import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (_req, res) => {
  const clinics = await prisma.clinic.findMany({
    include: { doctors: true },
    orderBy: { name: "asc" },
  });
  res.json(clinics);
});

router.get("/:id", async (req, res) => {
  const clinic = await prisma.clinic.findUnique({
    where: { id: req.params.id },
    include: { doctors: true },
  });
  if (!clinic) return res.status(404).json({ error: "Klinika topilmadi" });
  res.json(clinic);
});

export default router;
