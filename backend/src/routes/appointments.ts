import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { estimateWaitMinutes } from "../lib/queue";
import { notifyUser } from "../lib/notify";

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
      appointment: { doctorId, status: { not: "CANCELLED" } },
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

  await notifyUser(
    req.userId!,
    `Navbatingiz muvaffaqiyatli olindi! Navbat №${queueNumber}, oldinda ${peopleAhead} kishi, taxminiy kutish: ${estimatedWaitMinutes} daqiqa.`,
    "BOOKING_CONFIRMED"
  );

  res.status(201).json(appointment);
});

router.patch("/:id/cancel", async (req: AuthRequest, res) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: req.params.id },
    include: { queue: true },
  });
  if (!appointment || appointment.userId !== req.userId) {
    return res.status(404).json({ error: "Navbat topilmadi" });
  }
  if (appointment.status === "CANCELLED") {
    return res.status(400).json({ error: "Navbat allaqachon bekor qilingan" });
  }
  if (appointment.status === "DONE") {
    return res.status(400).json({ error: "Yakunlangan navbatni bekor qilib bo'lmaydi" });
  }

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: "CANCELLED" },
    include: { doctor: true, clinic: true, queue: true },
  });

  if (appointment.queue) {
    await prisma.queue.update({
      where: { id: appointment.queue.id },
      data: { status: "CANCELLED" },
    });
  }

  await notifyUser(req.userId!, "Navbatingiz bekor qilindi.", "BOOKING_CANCELLED");

  res.json(updated);
});

export default router;
