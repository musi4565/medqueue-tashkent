import { useEffect, useState } from "react";
import { Search, Stethoscope } from "lucide-react";
import { api } from "../lib/api";
import { Doctor } from "../types";
import DoctorCard from "../components/DoctorCard";
import { LoadingState, EmptyState, ErrorState } from "../components/StateMessage";

const SPECIALTIES = [
  "all",
  "Terapevt",
  "Kardiolog",
  "Pediatr",
  "Nevrolog",
  "Dermatolog",
  "Otolaringolog",
];

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      setError(null);
      api
        .get<Doctor[]>("/doctors", { params: { search: search || undefined, specialty } })
        .then((res) => setDoctors(res.data))
        .catch(() => setError("Shifokorlarni yuklab bo'lmadi. Qayta urinib ko'ring."))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [search, specialty]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Shifokorlar</h1>
        <p className="mt-1 text-sm text-ink/50">Mutaxassis shifokorni tanlab, navbat oling.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Shifokor ismini qidirish..."
            className="w-full rounded-full border border-ink/10 bg-white py-3 pl-11 pr-4 text-sm outline-none ring-primary/30 focus:ring-2"
          />
        </div>
        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="rounded-full border border-ink/10 bg-white px-4 py-3 text-sm outline-none ring-primary/30 focus:ring-2"
        >
          {SPECIALTIES.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "Barcha mutaxassisliklar" : s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState label="Shifokorlar yuklanmoqda..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : doctors.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="Shifokor topilmadi"
          description="Qidiruv yoki filtrni o'zgartirib ko'ring."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((d) => (
            <DoctorCard key={d.id} doctor={d} />
          ))}
        </div>
      )}
    </div>
  );
}
