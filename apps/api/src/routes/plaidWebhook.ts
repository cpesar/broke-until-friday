import express, { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { plaidItems, plaidWebhookEvents } from "../db/schema.js";
import { verifyPlaidWebhook } from "../lib/plaidWebhookVerify.js";
import { syncTransactionsForItem } from "../lib/transactionSync.js";

export const plaidWebhookRouter = Router();

const TRANSACTION_SYNC_CODES = new Set([
  "SYNC_UPDATES_AVAILABLE",
  "INITIAL_UPDATE",
  "HISTORICAL_UPDATE",
  "DEFAULT_UPDATE",
]);

plaidWebhookRouter.post("/", express.raw({ type: "*/*" }), async (req, res) => {
  const rawBody = req.body as Buffer;
  const signedJwt = req.headers["plaid-verification"];
  const verified = await verifyPlaidWebhook(
    typeof signedJwt === "string" ? signedJwt : undefined,
    rawBody,
  );

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  await db.insert(plaidWebhookEvents).values({
    plaidItemId: typeof payload.item_id === "string" ? payload.item_id : null,
    webhookType:
      typeof payload.webhook_type === "string"
        ? payload.webhook_type
        : "unknown",
    webhookCode:
      typeof payload.webhook_code === "string"
        ? payload.webhook_code
        : "unknown",
    verified,
    payload,
    processedAt: verified ? new Date() : null,
  });

  if (!verified) {
    res.status(403).json({ error: "Invalid webhook signature" });
    return;
  }

  if (
    payload.webhook_type === "TRANSACTIONS" &&
    typeof payload.webhook_code === "string" &&
    TRANSACTION_SYNC_CODES.has(payload.webhook_code) &&
    typeof payload.item_id === "string"
  ) {
    const [item] = await db
      .select()
      .from(plaidItems)
      .where(eq(plaidItems.plaidItemId, payload.item_id));

    if (item) {
      syncTransactionsForItem(item).catch((err: unknown) => {
        console.error("Webhook-triggered sync failed:", err);
      });
    }
  }

  res.json({ success: true });
});
