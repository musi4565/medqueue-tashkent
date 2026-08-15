import { useNavigate } from "react-router-dom";
import { CalendarClock, BellRing, FlaskConical, Gauge, ArrowRight } from "lucide-react";

const features = [
  {
    icon: CalendarClock,
    title: "Onlayn navbat",
    description: "Klinikaga bormasdan, uyingizdan turib navbat oling.",
  },
  {
    icon: Gauge,
    title: "Smart Queue",
    description: "Navbatingiz qayerda ekanini real vaqtda kuzating.",
  },
  {
    icon: BellRing,
    title: "Bildirishnoma",
    description: "Navbatingiz yaqinlashganda avtomatik xabar oling.",
  },
  {
    icon: FlaskConical,
    title: "Raqamli tahlil",
    description: "Tahlil natijalaringizni bitta joyda ko'ring.",
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-16">
      <section className="flex flex-col items-center gap-6 rounded-xl2 bg-gradient-to-br from-ink to-primary-dark px-6 py-20 text-center text-white sm:py-28">
        <h1 className="max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">
          MedQueue Tashkent — navbatni kutmang, vaqtingizni boshqaring.
        </h1>
        <p className="max-w-xl text-white/70">
          Bemor klinikaga kelishdan oldin onlayn navbat oladi, holatini kuzatadi va
          tahlil natijalarini bitta joyda ko'radi.
        </p>
        <button
          onClick={() => navigate("/book")}
          className="flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold tracking-wide text-ink shadow-soft transition hover:scale-[1.02]"
        >
          NAVBAT OLISH
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div
            key={f.title}
            className="flex flex-col gap-3 rounded-xl2 bg-white p-6 shadow-card"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <f.icon className="h-5 w-5" />
            </span>
            <p className="font-semibold text-ink">{f.title}</p>
            <p className="text-sm text-ink/55">{f.description}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
