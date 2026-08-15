import { useEffect, useState } from "react";
import { User as UserIcon, Phone, Mail, History, Send, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Appointment } from "../types";
import { LoadingState, EmptyState, ErrorState } from "../components/StateMessage";

const STATUS_LABEL: Record<string, string> = {
  BOOKED: "Band qilingan",
  DONE: "Yakunlangan",
  CANCELLED: "Bekor qilingan",
};

const STATUS_STYLE: Record<string, string> = {
  BOOKED: "bg-primary/10 text-primary",
  DONE: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
};

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "MedquequeTashbot";

function TelegramLinkCard() {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generateCode() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<{ code: string }>("/telegram/link-code");
      setCode(data.code);
    } catch {
      setError("Kod olishda xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl2 bg-white p-6 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Send className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-ink">Telegram bot bilan bog'lash</p>
          <p className="text-sm text-ink/50">
            Navbatingizni Telegram'dan ham kuzating — @{BOT_USERNAME}
          </p>
        </div>
      </div>

      {code ? (
        <div className="flex flex-col items-center gap-3 rounded-xl2 bg-surface p-5 text-center">
          <p className="text-xs text-ink/50">Botga shu kodni yuboring:</p>
          <p className="text-3xl font-extrabold tracking-widest text-ink">{code}</p>
          <a
            href={`https://t.me/${BOT_USERNAME}?start=link_${code}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Botni ochish
          </a>
          <p className="text-xs text-ink/40">Kod 10 daqiqa amal qiladi</p>
        </div>
      ) : (
        <button
          onClick={generateCode}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Bog'lash kodini olish
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Appointment[]>("/appointments")
      .then((res) => setAppointments(res.data))
      .catch(() => setError("Tashriflar tarixini yuklab bo'lmadi."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Profil</h1>
        <p className="mt-1 text-sm text-ink/50">Shaxsiy ma'lumotlaringiz va tashriflar tarixi.</p>
      </div>

      <div className="rounded-xl2 bg-white p-6 shadow-card">
        <div className="flex items-center gap-4 border-b border-ink/5 pb-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-semibold text-ink">{user?.name}</p>
            <p className="text-sm text-ink/50">Bemor</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-5 text-sm">
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-ink/40" />
            <span className="text-ink/50">Telefon:</span>
            <span className="font-medium text-ink">{user?.phone}</span>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-ink/40" />
            <span className="text-ink/50">Email:</span>
            <span className="font-medium text-ink">{user?.email}</span>
          </div>
        </div>
      </div>

      <TelegramLinkCard />

      <div>
        <p className="mb-3 flex items-center gap-2 font-semibold text-ink">
          <History className="h-4 w-4" /> Tashriflar tarixi
        </p>

        {loading ? (
          <LoadingState label="Yuklanmoqda..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : appointments.length === 0 ? (
          <EmptyState icon={History} title="Hali tashriflar yo'q" />
        ) : (
          <div className="flex flex-col gap-3">
            {appointments.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl2 bg-white p-4 shadow-card"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{a.doctor.name}</p>
                  <p className="text-xs text-ink/50">
                    {a.clinic.name} · {a.date} {a.time}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[a.status]}`}
                >
                  {STATUS_LABEL[a.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
