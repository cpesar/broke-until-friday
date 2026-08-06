import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import type { HealthCheckResponse } from "@budget-app/shared";
import { auth } from "./lib/auth.js";
import { requireSession } from "./middleware/requireSession.js";
import { plaidRouter } from "./routes/plaid.js";
import { plaidWebhookRouter } from "./routes/plaidWebhook.js";
import { transactionsRouter } from "./routes/transactions.js";
import { categoriesRouter } from "./routes/categories.js";
import { budgetsRouter } from "./routes/budgets.js";
import { seedDefaultCategories } from "./db/seedCategories.js";

export function createApp() {
  const app = express();

  seedDefaultCategories().catch((err: unknown) => {
    console.error("Failed to seed default categories:", err);
  });

  app.use(
    cors({
      origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
      credentials: true,
    }),
  );

  // Better Auth and the Plaid webhook receiver need the raw request stream,
  // so both must be mounted before express.json().
  app.all("/api/auth/*splat", toNodeHandler(auth));
  app.use("/api/plaid/webhook", plaidWebhookRouter);

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

  app.use("/api/plaid", plaidRouter);
  app.use("/api/transactions", transactionsRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/budgets", budgetsRouter);

  return app;
}
