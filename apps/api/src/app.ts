import express from "express";
import cors from "cors";
import type { HealthCheckResponse } from "@budget-app/shared";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    const body: HealthCheckResponse = {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
    res.json(body);
  });

  return app;
}
