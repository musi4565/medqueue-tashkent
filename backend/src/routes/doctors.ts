import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (req, res) => {
  const { search, specialty, clinicId } = req.query as Record<string, string | undefined>;
  const doctors = await prisma.doctor.findMany({
    where: {
      AND: [
        search
          ? { name: { contains: search } }
          : {},
        specialty && specialty !== "all" ? { specialty } : {},
        clinicId ? { clinicId } : {},
      ],
    },
    include: { clinic: true },
    orderBy: { name: "asc" },
  });
  res.json(doctors);
});

router.get("/:id", async (req, res) => {
  const doctor = await prisma.doctor.findUnique({
    where: { id: req.params.id },
    include: { clinic: true },
  });
  if (!doctor) return res.status(404).json({ error: "Shifokor topilmadi" });
  res.json(doctor);
});

export default router;
