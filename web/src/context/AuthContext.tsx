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

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  notifications: Notification[];
  unreadCount: number;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
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
    async function bootstrap() {
      const existingToken = localStorage.getItem("medqueue_token");
      const existingUser = localStorage.getItem("medqueue_user");

      if (existingToken && existingUser) {
        setUser(JSON.parse(existingUser));
        connectSocket(existingToken);
        setReady(true);
        return;
      }

      try {
        let res;
        try {
          res = await api.post("/auth/login", {
            email: DEMO_EMAIL,
            password: DEMO_PASSWORD,
          });
        } catch {
          res = await api.post("/auth/register", {
            name: "Aziz Ergashov",
            phone: "+998901234567",
            email: DEMO_EMAIL,
            password: DEMO_PASSWORD,
          });
        }
        const { token, user: loggedInUser } = res.data;
        localStorage.setItem("medqueue_token", token);
        localStorage.setItem("medqueue_user", JSON.stringify(loggedInUser));
        setUser(loggedInUser);
        connectSocket(token);
      } catch (err) {
        console.error("Auto-login failed", err);
      } finally {
        setReady(true);
      }
    }

    bootstrap();

    return () => {
      disconnectSocket();
    };
  }, []);

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

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        ready,
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
