import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, Check, Loader2, MapPin, CalendarDays } from "lucide-react";
import { api } from "../lib/api";
import { Clinic, Doctor, Appointment } from "../types";
import QueueStatusCard from "../components/QueueStatusCard";
import { LoadingState } from "../components/StateMessage";

const STEP_LABELS = ["Klinika", "Shifokor", "Sana va vaqt"];

function nextDays(count: number) {
  const days = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      iso: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("uz-UZ", { weekday: "short", day: "numeric", month: "short" }),
    });
  }
  return days;
}

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
];

export default function BookAppointment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingClinics, setLoadingClinics] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const [step, setStep] = useState(1);
  const [clinicId, setClinicId] = useState(searchParams.get("clinicId") || "");
  const [doctorId, setDoctorId] = useState(searchParams.get("doctorId") || "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);

  const days = useMemo(() => nextDays(7), []);

  useEffect(() => {
    api
      .get<Clinic[]>("/clinics")
      .then((res) => {
        setClinics(res.data);
        if (clinicId) setStep(doctorId ? 3 : 2);
      })
      .finally(() => setLoadingClinics(false));
  }, []);

  useEffect(() => {
    if (!clinicId) {
      setDoctors([]);
      return;
    }
    setLoadingDoctors(true);
    api
      .get<Doctor[]>("/doctors", { params: { clinicId } })
      .then((res) => setDoctors(res.data))
      .finally(() => setLoadingDoctors(false));
  }, [clinicId]);

  const selectedClinic = clinics.find((c) => c.id === clinicId);
  const selectedDoctor = doctors.find((d) => d.id === doctorId);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post<Appointment>("/appointments", {
        clinicId,
        doctorId,
        date,
        time,
      });
      setConfirmed(data);
    } catch {
      setError("Navbat olishda xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed && confirmed.queue) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-ink">Navbatingiz muvaffaqiyatli olindi!</h1>
        <QueueStatusCard
          queue={confirmed.queue}
          doctorName={confirmed.doctor.name}
          clinicName={confirmed.clinic.name}
        />
        <div className="flex w-full gap-3">
          <button
            onClick={() => navigate("/queue")}
            className="flex-1 rounded-full bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Smart Queue'ni ko'rish
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex-1 rounded-full border border-ink/10 bg-white py-3 text-sm font-semibold text-ink transition hover:bg-ink/5"
          >
            Bosh sahifa
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Navbat olish</h1>
        <p className="mt-1 text-sm text-ink/50">3 bosqichda navbatingizni band qiling.</p>
      </div>

      <div className="flex items-center gap-2">
        {STEP_LABELS.map((label, i) => {
          const idx = i + 1;
          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  idx <= step ? "bg-primary text-white" : "bg-ink/10 text-ink/40"
                }`}
              >
                {idx < step ? <Check className="h-4 w-4" /> : idx}
              </div>
              <p className={`text-xs font-medium ${idx <= step ? "text-ink" : "text-ink/40"}`}>
                {label}
              </p>
              {idx < STEP_LABELS.length && <div className="h-px flex-1 bg-ink/10" />}
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-3">
          {loadingClinics ? (
            <LoadingState label="Klinikalar yuklanmoqda..." />
          ) : (
            clinics.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setClinicId(c.id);
                  setDoctorId("");
                  setStep(2);
                }}
                className={`flex items-start gap-3 rounded-xl2 border bg-white p-4 text-left transition hover:shadow-card ${
                  clinicId === c.id ? "border-primary ring-1 ring-primary" : "border-ink/10"
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold text-ink">{c.name}</span>
                  <span className="mt-1 flex items-center gap-1 text-xs text-ink/50">
                    <MapPin className="h-3 w-3" /> {c.address}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <button onClick={() => setStep(1)} className="w-fit text-sm text-primary hover:underline">
            ← Klinikani o'zgartirish
          </button>
          {loadingDoctors ? (
            <LoadingState label="Shifokorlar yuklanmoqda..." />
          ) : doctors.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink/50">Bu klinikada shifokor topilmadi.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {doctors.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setDoctorId(d.id);
                    setStep(3);
                  }}
                  className={`flex items-center gap-3 rounded-xl2 border bg-white p-4 text-left transition hover:shadow-card ${
                    doctorId === d.id ? "border-primary ring-1 ring-primary" : "border-ink/10"
                  }`}
                >
                  <img src={d.photoUrl} alt={d.name} className="h-12 w-12 rounded-full object-cover" />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{d.name}</span>
                    <span className="text-xs text-primary">{d.specialty}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-6">
          <button onClick={() => setStep(2)} className="w-fit text-sm text-primary hover:underline">
            ← Shifokorni o'zgartirish
          </button>

          {selectedDoctor && selectedClinic && (
            <div className="flex items-center gap-3 rounded-xl2 bg-white p-4 shadow-card">
              <img
                src={selectedDoctor.photoUrl}
                alt={selectedDoctor.name}
                className="h-12 w-12 rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-semibold text-ink">{selectedDoctor.name}</p>
                <p className="text-xs text-ink/50">
                  {selectedDoctor.specialty} · {selectedClinic.name}
                </p>
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <CalendarDays className="h-4 w-4" /> Sanani tanlang
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map((d) => (
                <button
                  key={d.iso}
                  onClick={() => setDate(d.iso)}
                  className={`shrink-0 rounded-xl border px-4 py-2.5 text-xs font-medium capitalize transition ${
                    date === d.iso
                      ? "border-primary bg-primary text-white"
                      : "border-ink/10 bg-white text-ink/70 hover:border-primary/40"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Vaqtni tanlang</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {TIME_SLOTS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTime(t)}
                  className={`rounded-xl border px-2 py-2.5 text-xs font-medium transition ${
                    time === t
                      ? "border-primary bg-primary text-white"
                      : "border-ink/10 bg-white text-ink/70 hover:border-primary/40"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            disabled={!date || !time || submitting}
            onClick={handleConfirm}
            className="flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold tracking-wide text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            TASDIQLASH
          </button>
        </div>
      )}
    </div>
  );
}
