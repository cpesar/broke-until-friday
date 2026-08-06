import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import type { HealthCheckResponse } from "@budget-app/shared";
import { auth } from "./lib/auth.js";
import { requireSession } from "./middleware/requireSession.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
      credentials: true,
    }),
  );

  // Better Auth needs the raw request stream, so it must be mounted before express.json().
  app.all("/api/auth/*splat", toNodeHandler(auth));

  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    const body: HealthCheckResponse = {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
    res.json(body);
  });

  app.get("/api/me", requireSession, (req, res) => {
    res.json({ user: req.session?.user });
  });

  return app;
}
