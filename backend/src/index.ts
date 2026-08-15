import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { verifyToken } from "./lib/jwt";
import { setIO } from "./socket";
import { startSimulation } from "./simulation";
import { startBot, stopBot } from "./telegram/bot";

import authRoutes from "./routes/auth";
import doctorsRoutes from "./routes/doctors";
import clinicsRoutes from "./routes/clinics";
import appointmentsRoutes from "./routes/appointments";
import queueRoutes from "./routes/queue";
import labsRoutes from "./routes/labs";
import notificationsRoutes from "./routes/notifications";
import telegramAuthRoutes from "./routes/telegramAuth";

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173").split(",");

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorsRoutes);
app.use("/api/clinics", clinicsRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/labs", labsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/telegram", telegramAuthRoutes);

app.use((_req, res) => res.status(404).json({ error: "Topilmadi" }));

const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
});
setIO(io);

io.on("connection", (socket) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (token) {
    try {
      const { userId } = verifyToken(token);
      socket.join(`user:${userId}`);
    } catch {
      // ignore invalid token, socket just won't receive personal events
    }
  }
});

const PORT = Number(process.env.PORT) || 4000;
server.listen(PORT, () => {
  console.log(`MedQueue backend running on port ${PORT}`);
  startSimulation();
  startBot();
});

process.on("SIGTERM", () => {
  stopBot();
  server.close(() => process.exit(0));
});
