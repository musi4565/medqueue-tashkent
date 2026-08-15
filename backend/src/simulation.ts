import { prisma } from "./lib/prisma";
import { emitToUser } from "./socket";
import { estimateWaitMinutes } from "./lib/queue";
import { notifyUser } from "./lib/notify";

const TICK_MS = 7000;
const LAB_TICK_MS = 25000;

async function tickQueues() {
  const today = new Date().toISOString().slice(0, 10);

  // only appointments scheduled for today (or earlier) should move through
  // the queue — a booking made for a future date must stay put until that
  // day actually arrives, instead of racing to "done" within seconds
  const activeQueues = await prisma.queue.findMany({
    where: {
      status: { in: ["WAITING", "APPROACHING"] },
      appointment: { status: { not: "CANCELLED" }, date: { lte: today } },
    },
    include: { appointment: true },
  });

  for (const q of activeQueues) {
    const nextPeopleAhead = Math.max(0, q.peopleAhead - 1);
    const nextEstimate = estimateWaitMinutes(nextPeopleAhead);
    let nextStatus = q.status;

    if (nextPeopleAhead === 0) {
      nextStatus = "CALLED";
    } else if (nextPeopleAhead <= 2) {
      nextStatus = "APPROACHING";
    }

    const updated = await prisma.queue.update({
      where: { id: q.id },
      data: {
        peopleAhead: nextPeopleAhead,
        estimatedWaitMinutes: nextEstimate,
        status: nextStatus,
      },
    });

    if (nextStatus === "CALLED" && q.appointment.status !== "DONE") {
      await prisma.appointment.update({
        where: { id: q.appointment.id },
        data: { status: "DONE" },
      });
    }

    emitToUser(q.appointment.userId, "queue:update", {
      appointmentId: q.appointment.id,
      queueNumber: updated.queueNumber,
      peopleAhead: updated.peopleAhead,
      estimatedWaitMinutes: updated.estimatedWaitMinutes,
      status: updated.status,
    });

    if (nextStatus === "APPROACHING" && q.status === "WAITING") {
      await notifyUser(
        q.appointment.userId,
        `Navbatingiz yaqinlashmoqda. Oldinda ${updated.peopleAhead} kishi qoldi, taxminiy kutish: ${updated.estimatedWaitMinutes} daqiqa.`,
        "QUEUE_APPROACHING"
      );
    }

    if (nextStatus === "CALLED" && q.status !== "CALLED") {
      await notifyUser(q.appointment.userId, "Navbatingiz keldi.", "QUEUE_CALLED");
    }
  }
}

async function tickLabs() {
  const pending = await prisma.labTest.findMany({ where: { status: "PENDING" } });
  if (pending.length === 0) return;

  const pick = pending[Math.floor(Math.random() * pending.length)];
  const updated = await prisma.labTest.update({
    where: { id: pick.id },
    data: { status: "READY" },
  });

  emitToUser(pick.userId, "lab:update", updated);
  await notifyUser(pick.userId, "Tahlilingiz tayyor.", "LAB_READY");
}

export function startSimulation() {
  setInterval(() => {
    tickQueues().catch((err) => console.error("queue tick error", err));
  }, TICK_MS);

  setInterval(() => {
    tickLabs().catch((err) => console.error("lab tick error", err));
  }, LAB_TICK_MS);
}
