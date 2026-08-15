import { useEffect, useState } from "react";
import { FlaskConical, X, Hourglass, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { LabTest } from "../types";
import { LoadingState, EmptyState, ErrorState } from "../components/StateMessage";

type Tab = "PENDING" | "READY";

export default function LabResults() {
  const [labs, setLabs] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("READY");
  const [selected, setSelected] = useState<LabTest | null>(null);

  useEffect(() => {
    api
      .get<LabTest[]>("/labs")
      .then((res) => setLabs(res.data))
      .catch(() => setError("Tahlillarni yuklab bo'lmadi."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onUpdate = (updated: LabTest) => {
      setLabs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    };
    socket.on("lab:update", onUpdate);
    return () => {
      socket.off("lab:update", onUpdate);
    };
  }, []);

  const filtered = labs.filter((l) => l.status === tab);
  const pendingCount = labs.filter((l) => l.status === "PENDING").length;
  const readyCount = labs.filter((l) => l.status === "READY").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Tahlillar</h1>
        <p className="mt-1 text-sm text-ink/50">Laboratoriya natijalaringiz shu yerda.</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("READY")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            tab === "READY" ? "bg-primary text-white" : "bg-white text-ink/60"
          }`}
        >
          Tayyor ({readyCount})
        </button>
        <button
          onClick={() => setTab("PENDING")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            tab === "PENDING" ? "bg-primary text-white" : "bg-white text-ink/60"
          }`}
        >
          Jarayonda ({pendingCount})
        </button>
      </div>

      {loading ? (
        <LoadingState label="Tahlillar yuklanmoqda..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title={tab === "READY" ? "Tayyor tahlil yo'q" : "Jarayondagi tahlil yo'q"}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((lab) => (
            <div key={lab.id} className="flex flex-col gap-3 rounded-xl2 bg-white p-5 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-ink">{lab.name}</p>
                {lab.status === "READY" ? (
                  <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Tayyor
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                    <Hourglass className="h-3.5 w-3.5" /> Jarayonda
                  </span>
                )}
              </div>
              <p className="text-xs text-ink/50">Sana: {lab.date}</p>
              {lab.status === "READY" && (
                <button
                  onClick={() => setSelected(lab)}
                  className="mt-1 rounded-full bg-primary/10 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
                >
                  Natijani ko'rish
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl2 bg-white p-6 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <p className="text-lg font-bold text-ink">{selected.name}</p>
              <button
                onClick={() => setSelected(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink/40 hover:bg-ink/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between border-b border-ink/5 pb-2">
                <span className="text-ink/50">Sana</span>
                <span className="font-medium text-ink">{selected.date}</span>
              </div>
              <div className="flex justify-between border-b border-ink/5 pb-2">
                <span className="text-ink/50">Natija</span>
                <span className="font-medium text-ink">{selected.result ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/50">Normal diapazon</span>
                <span className="font-medium text-ink">{selected.normalRange ?? "—"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
