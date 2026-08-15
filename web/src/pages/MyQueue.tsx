import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ListChecks, X } from "lucide-react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { Appointment, QueueStatus } from "../types";
import QueueStatusCard from "../components/QueueStatusCard";
import { LoadingState, EmptyState, ErrorState } from "../components/StateMessage";

export default function MyQueue() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

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
      status: QueueStatus;
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

  const active = appointments.find(
    (a) => a.queue && (a.queue.status === "WAITING" || a.queue.status === "APPROACHING")
  );
  const terminal = appointments.find(
    (a) => a.queue && (a.queue.status === "CALLED" || a.queue.status === "CANCELLED")
  );
  const current = active || terminal;

  async function handleCancel() {
    if (!current) return;
    setCancelling(true);
    try {
      const { data } = await api.patch<Appointment>(`/appointments/${current.id}/cancel`);
      setAppointments((prev) => prev.map((a) => (a.id === data.id ? data : a)));
      setConfirmingCancel(false);
    } catch {
      setError("Navbatni bekor qilib bo'lmadi. Qayta urinib ko'ring.");
    } finally {
      setCancelling(false);
    }
  }

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
            description="Hozirda faol navbatingiz yo'q."
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

          {(current.queue.status === "WAITING" || current.queue.status === "APPROACHING") &&
            (confirmingCancel ? (
              <div className="flex flex-col gap-3 rounded-xl2 border border-red-100 bg-red-50 p-4 text-center">
                <p className="text-sm font-medium text-red-700">
                  Rostdan ham navbatni bekor qilmoqchimisiz?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    {cancelling ? "Bekor qilinmoqda..." : "Ha, bekor qilish"}
                  </button>
                  <button
                    onClick={() => setConfirmingCancel(false)}
                    className="flex-1 rounded-full border border-ink/10 bg-white py-2.5 text-sm font-semibold text-ink transition hover:bg-ink/5"
                  >
                    Yo'q
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingCancel(true)}
                className="flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
              >
                <X className="h-4 w-4" />
                Bekor qilish
              </button>
            ))}
        </>
      )}
    </div>
  );
}
