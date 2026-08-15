import { prisma } from "./lib/prisma";
import { emitToUser } from "./socket";
import { estimateWaitMinutes } from "./lib/queue";

const TICK_MS = 7000;
const LAB_TICK_MS = 25000;

async function tickQueues() {
  const activeQueues = await prisma.queue.findMany({
    where: { status: { in: ["WAITING", "APPROACHING"] } },
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
      const notif = await prisma.notification.create({
        data: {
          userId: q.appointment.userId,
          message: "Navbatingiz yaqinlashmoqda.",
          type: "QUEUE_APPROACHING",
        },
      });
      emitToUser(q.appointment.userId, "notification:new", notif);
    }

    if (nextStatus === "CALLED" && q.status !== "CALLED") {
      const notif = await prisma.notification.create({
        data: {
          userId: q.appointment.userId,
          message: "Navbatingiz keldi.",
          type: "QUEUE_CALLED",
        },
      });
      emitToUser(q.appointment.userId, "notification:new", notif);
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

  const notif = await prisma.notification.create({
    data: {
      userId: pick.userId,
      message: "Tahlilingiz tayyor.",
      type: "LAB_READY",
    },
  });

  emitToUser(pick.userId, "lab:update", updated);
  emitToUser(pick.userId, "notification:new", notif);
}

export function startSimulation() {
  setInterval(() => {
    tickQueues().catch((err) => console.error("queue tick error", err));
  }, TICK_MS);

  setInterval(() => {
    tickLabs().catch((err) => console.error("lab tick error", err));
  }, LAB_TICK_MS);
}
