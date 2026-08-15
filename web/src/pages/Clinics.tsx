import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { api } from "../lib/api";
import { Clinic } from "../types";
import ClinicCard from "../components/ClinicCard";
import { LoadingState, EmptyState, ErrorState } from "../components/StateMessage";

export default function Clinics() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Clinic[]>("/clinics")
      .then((res) => setClinics(res.data))
      .catch(() => setError("Klinikalarni yuklab bo'lmadi. Qayta urinib ko'ring."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Klinikalar</h1>
        <p className="mt-1 text-sm text-ink/50">Sizga qulay klinikani tanlang.</p>
      </div>

      {loading ? (
        <LoadingState label="Klinikalar yuklanmoqda..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : clinics.length === 0 ? (
        <EmptyState icon={Building2} title="Klinika topilmadi" />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {clinics.map((c) => (
            <ClinicCard key={c.id} clinic={c} />
          ))}
        </div>
      )}
    </div>
  );
}
