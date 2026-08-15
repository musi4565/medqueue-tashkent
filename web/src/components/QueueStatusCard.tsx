import { Hourglass, Users, Timer, CheckCircle2, XCircle } from "lucide-react";
import { Queue } from "../types";

const STEPS = [
  { key: "WAITING", label: "Navbatda" },
  { key: "APPROACHING", label: "Yaqinlashmoqda" },
  { key: "CALLED", label: "Qabul" },
] as const;

export default function QueueStatusCard({
  queue,
  doctorName,
  clinicName,
}: {
  queue: Queue;
  doctorName?: string;
  clinicName?: string;
}) {
  const stepIndex = STEPS.findIndex((s) => s.key === queue.status);

  if (queue.status === "CANCELLED") {
    return (
      <div className="rounded-xl2 bg-white p-6 shadow-soft sm:p-8">
        {(doctorName || clinicName) && (
          <p className="mb-4 text-sm text-ink/50">
            {doctorName}
            {doctorName && clinicName ? " · " : ""}
            {clinicName}
          </p>
        )}
        <div className="flex flex-col items-center gap-2 rounded-xl2 bg-red-50 p-8 text-center text-red-600">
          <XCircle className="h-8 w-8" />
          <p className="font-semibold">Navbat №{queue.queueNumber} bekor qilingan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl2 bg-white p-6 shadow-soft sm:p-8">
      {(doctorName || clinicName) && (
        <p className="mb-4 text-sm text-ink/50">
          {doctorName}
          {doctorName && clinicName ? " · " : ""}
          {clinicName}
        </p>
      )}

      <div className="mb-6 flex flex-col items-center rounded-xl2 bg-gradient-to-br from-primary to-primary-dark p-8 text-center text-white">
        <p className="text-sm font-medium text-white/80">NAVBAT</p>
        <p className="text-6xl font-extrabold tracking-tight">№{queue.queueNumber}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center gap-1 rounded-xl2 bg-surface p-4 text-center">
          <Users className="h-5 w-5 text-primary" />
          <p className="text-2xl font-bold text-ink">{queue.peopleAhead}</p>
          <p className="text-xs text-ink/50">kishi oldinda</p>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl2 bg-surface p-4 text-center">
          <Timer className="h-5 w-5 text-primary" />
          <p className="text-2xl font-bold text-ink">{queue.estimatedWaitMinutes} daq</p>
          <p className="text-xs text-ink/50">taxminiy kutish</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        {STEPS.map((step, i) => (
          <div key={step.key} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-center">
              <div className="flex-1 border-t border-dashed border-ink/10 first:border-transparent" />
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  i <= stepIndex ? "bg-primary text-white" : "bg-ink/10 text-ink/30"
                }`}
              >
                {i < stepIndex ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Hourglass className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 border-t border-dashed border-ink/10 last:border-transparent" />
            </div>
            <p
              className={`text-center text-xs font-medium ${
                i === stepIndex ? "text-primary" : "text-ink/40"
              }`}
            >
              {step.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
