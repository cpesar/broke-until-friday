import { Router } from "express";
import { and, eq, gte, lte, inArray, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { plaidItems, financialAccounts, transactions } from "../db/schema.js";
import { requireSession } from "../middleware/requireSession.js";
import { syncTransactionsForItem } from "../lib/transactionSync.js";

export const transactionsRouter = Router();

transactionsRouter.use(requireSession);

transactionsRouter.post("/sync", async (req, res) => {
  const userId = req.session!.user.id;
  const items = await db
    .select()
    .from(plaidItems)
    .where(eq(plaidItems.userId, userId));

  const results = [];
  for (const item of items) {
    const result = await syncTransactionsForItem(item);
    results.push({
      itemId: item.id,
      institutionName: item.institutionName,
      ...result,
    });
  }

  res.json({ results });
});

transactionsRouter.get("/", async (req, res) => {
  const userId = req.session!.user.id;

  const items = await db
    .select({ id: plaidItems.id })
    .from(plaidItems)
    .where(eq(plaidItems.userId, userId));

  const accounts = items.length
    ? await db
        .select({ id: financialAccounts.id })
        .from(financialAccounts)
        .where(
          inArray(
            financialAccounts.plaidItemId,
            items.map((item) => item.id),
          ),
        )
    : [];

  if (!accounts.length) {
    res.json({ transactions: [] });
    return;
  }

  const accountIds = accounts.map((account) => account.id);
  const { from, to } = req.query as { from?: string; to?: string };

  const conditions = [
    inArray(transactions.financialAccountId, accountIds),
    eq(transactions.isRemoved, false),
  ];
  if (from) conditions.push(gte(transactions.date, from));
  if (to) conditions.push(lte(transactions.date, to));

  const rows = await db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.date))
    .limit(200);

  res.json({ transactions: rows });
});
