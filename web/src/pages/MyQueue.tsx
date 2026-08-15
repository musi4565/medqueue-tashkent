import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ListChecks } from "lucide-react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { Appointment } from "../types";
import QueueStatusCard from "../components/QueueStatusCard";
import { LoadingState, EmptyState, ErrorState } from "../components/StateMessage";

export default function MyQueue() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Appointment[]>("/appointments")
      .then((res) => setAppointments(res.data))
      .catch(() => setError("Navbat ma'lumotlarini yuklab bo'lmadi."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onUpdate = (payload: {
      appointmentId: string;
      queueNumber: number;
      peopleAhead: number;
      estimatedWaitMinutes: number;
      status: "WAITING" | "APPROACHING" | "CALLED";
    }) => {
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === payload.appointmentId && a.queue
            ? {
                ...a,
                status: payload.status === "CALLED" ? "DONE" : a.status,
                queue: {
                  ...a.queue,
                  queueNumber: payload.queueNumber,
                  peopleAhead: payload.peopleAhead,
                  estimatedWaitMinutes: payload.estimatedWaitMinutes,
                  status: payload.status,
                },
              }
            : a
        )
      );
    };

    socket.on("queue:update", onUpdate);
    return () => {
      socket.off("queue:update", onUpdate);
    };
  }, []);

  const active = appointments.find((a) => a.queue && a.queue.status !== "CALLED");
  const lastCalled = appointments.find((a) => a.queue && a.queue.status === "CALLED");
  const current = active || lastCalled;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Mening navbatim</h1>
        <p className="mt-1 text-sm text-ink/50">Navbatingiz holatini real vaqtda kuzating.</p>
      </div>

      {loading ? (
        <LoadingState label="Navbat holatini yuklamoqda..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : !current || !current.queue ? (
        <>
          <EmptyState
            icon={ListChecks}
            title="Faol navbatingiz yo'q"
            description="Hozircha band qilingan navbat topilmadi."
          />
          <button
            onClick={() => navigate("/book")}
            className="rounded-full bg-primary py-3.5 text-sm font-bold tracking-wide text-white transition hover:bg-primary-dark"
          >
            NAVBAT OLISH
          </button>
        </>
      ) : (
        <>
          <QueueStatusCard
            queue={current.queue}
            doctorName={current.doctor.name}
            clinicName={current.clinic.name}
          />
          {current.queue.status === "CALLED" && (
            <div className="rounded-xl2 bg-green-50 p-4 text-center text-sm font-medium text-green-700">
              Navbatingiz keldi — qabulga xush kelibsiz!
            </div>
          )}
        </>
      )}
    </div>
  );
}
