import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { estimateWaitMinutes } from "../lib/queue";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  const appointments = await prisma.appointment.findMany({
    where: { userId: req.userId },
    include: { doctor: true, clinic: true, queue: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(appointments);
});

router.post("/", async (req: AuthRequest, res) => {
  const { doctorId, clinicId, date, time } = req.body ?? {};
  if (!doctorId || !clinicId || !date || !time) {
    return res.status(400).json({ error: "Klinika, shifokor, sana va vaqt tanlanishi shart" });
  }

  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) return res.status(404).json({ error: "Shifokor topilmadi" });

  const activeQueues = await prisma.queue.count({
    where: {
      status: { in: ["WAITING", "APPROACHING"] },
      appointment: { doctorId },
    },
  });
  const totalForDoctor = await prisma.appointment.count({ where: { doctorId } });

  const peopleAhead = activeQueues;
  const queueNumber = totalForDoctor + 1;
  const estimatedWaitMinutes = estimateWaitMinutes(peopleAhead);

  const appointment = await prisma.appointment.create({
    data: {
      userId: req.userId!,
      doctorId,
      clinicId,
      date,
      time,
      status: "BOOKED",
      queue: {
        create: {
          queueNumber,
          peopleAhead,
          estimatedWaitMinutes,
          status: "WAITING",
        },
      },
    },
    include: { doctor: true, clinic: true, queue: true },
  });

  res.status(201).json(appointment);
});

export default router;
