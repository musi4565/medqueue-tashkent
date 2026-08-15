import { Request, Response, NextFunction } from "express";
import { BOT_INTERNAL_SECRET } from "../lib/botSecret";

export function requireBotSecret(req: Request, res: Response, next: NextFunction) {
  if (req.headers["x-bot-secret"] !== BOT_INTERNAL_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}
