import { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "hozir";
  if (mins < 60) return `${mins} daqiqa oldin`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return `${Math.floor(hours / 24)} kun oldin`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } =
    useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Bildirishnomalar"
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink/70 transition hover:bg-ink/5"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl2 border border-ink/10 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
            <p className="font-semibold text-ink">Bildirishnomalar</p>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllNotificationsRead()}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Hammasini o'qilgan qil
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink/40">
                Bildirishnomalar yo'q
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.read && markNotificationRead(n.id)}
                  className={`block w-full border-b border-ink/5 px-4 py-3 text-left text-sm transition hover:bg-surface ${
                    n.read ? "text-ink/50" : "bg-primary/5 text-ink"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={n.read ? "" : "font-medium"}>{n.message}</p>
                    {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-1 text-xs text-ink/35">{timeAgo(n.createdAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
