import { NavLink, useNavigate } from "react-router-dom";
import { Activity, Menu, X } from "lucide-react";
import { useState } from "react";
import NotificationBell from "./NotificationBell";

const links = [
  { to: "/", label: "Bosh sahifa" },
  { to: "/doctors", label: "Shifokorlar" },
  { to: "/clinics", label: "Klinikalar" },
  { to: "/queue", label: "Mening navbatim" },
  { to: "/labs", label: "Tahlillar" },
  { to: "/profile", label: "Profil" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink/5 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2 font-extrabold text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Activity className="h-4.5 w-4.5" />
          </span>
          <span className="hidden sm:inline">MedQueue Tashkent</span>
        </NavLink>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                `rounded-full px-3.5 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-ink/60 hover:bg-ink/5 hover:text-ink"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => navigate("/book")}
            className="hidden rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark sm:inline-block"
          >
            Navbat olish
          </button>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink/70 hover:bg-ink/5 lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menyu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-ink/5 bg-white px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive ? "bg-primary/10 text-primary" : "text-ink/70"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <button
              onClick={() => {
                setOpen(false);
                navigate("/book");
              }}
              className="mt-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white"
            >
              Navbat olish
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
