import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { api } from "../lib/api";
import { connectSocket, disconnectSocket } from "../lib/socket";
import { Notification, User } from "../types";

const DEMO_EMAIL = "demo@medqueue.uz";
const DEMO_PASSWORD = "demo1234";
const MAX_BOOT_ATTEMPTS = 6;
const RETRY_DELAY_MS = 6000;

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  bootError: string | null;
  retry: () => void;
  notifications: Notification[];
  unreadCount: number;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function clearStoredSession() {
  localStorage.removeItem("medqueue_token");
  localStorage.removeItem("medqueue_user");
}

function storeSession(token: string, user: User) {
  localStorage.setItem("medqueue_token", token);
  localStorage.setItem("medqueue_user", JSON.stringify(user));
}

async function loginOrRegisterDemo(): Promise<{ token: string; user: User }> {
  try {
    const res = await api.post("/auth/login", {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    return res.data;
  } catch (err: any) {
    // demo account doesn't exist yet on a freshly reset database — create it
    if (err?.response?.status === 401 || err?.response?.status === 404) {
      const res = await api.post("/auth/register", {
        name: "Aziz Ergashov",
        phone: "+998901234567",
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      return res.data;
    }
    throw err;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [bootTick, setBootTick] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const refreshNotifications = useCallback(async () => {
    try {
      const { data } = await api.get<Notification[]>("/notifications");
      setNotifications(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setReady(false);
      setBootError(null);

      const existingToken = localStorage.getItem("medqueue_token");

      // a token from a previous session may point at a user that no longer
      // exists (Render's free tier resets the SQLite file on every cold
      // start) — verify it against the backend before trusting it
      if (existingToken) {
        try {
          const { data: verifiedUser } = await api.get<User>("/auth/me", {
            timeout: 15000,
          });
          if (cancelled) return;
          setUser(verifiedUser);
          connectSocket(existingToken);
          setReady(true);
          return;
        } catch {
          clearStoredSession();
        }
      }

      for (let attempt = 1; attempt <= MAX_BOOT_ATTEMPTS; attempt++) {
        if (cancelled) return;
        try {
          const { token, user: loggedInUser } = await loginOrRegisterDemo();
          if (cancelled) return;
          storeSession(token, loggedInUser);
          setUser(loggedInUser);
          connectSocket(token);
          setReady(true);
          return;
        } catch (err) {
          if (attempt === MAX_BOOT_ATTEMPTS) {
            if (cancelled) return;
            setBootError(
              "Serverga ulanib bo'lmadi. Internetni tekshiring yoki qayta urinib ko'ring."
            );
            setReady(true);
            return;
          }
          await sleep(RETRY_DELAY_MS);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
      disconnectSocket();
    };
  }, [bootTick]);

  useEffect(() => {
    if (!ready || !user) return;
    refreshNotifications();

    const socket = connectSocket(localStorage.getItem("medqueue_token") || "");
    const onNew = (notif: Notification) => {
      setNotifications((prev) => [notif, ...prev]);
    };
    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, [ready, user, refreshNotifications]);

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      // ignore
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.patch("/notifications/read-all");
    } catch {
      // ignore
    }
  }, []);

  const retry = useCallback(() => {
    setBootTick((t) => t + 1);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        ready,
        bootError,
        retry,
        notifications,
        unreadCount,
        markNotificationRead,
        markAllNotificationsRead,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
