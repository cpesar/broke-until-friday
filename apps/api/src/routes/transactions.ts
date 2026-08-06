import { Router } from "express";
import { and, eq, gte, lte, inArray, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { plaidItems, transactions, categories } from "../db/schema.js";
import { requireSession } from "../middleware/requireSession.js";
import { syncTransactionsForItem } from "../lib/transactionSync.js";
import { getUserAccountIds } from "../lib/userAccounts.js";

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
  const accountIds = await getUserAccountIds(userId);

  if (!accountIds.length) {
    res.json({ transactions: [] });
    return;
  }

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

transactionsRouter.patch("/:id", async (req, res) => {
  const userId = req.session!.user.id;
  const { id } = req.params;
  const { categoryId } = req.body as { categoryId?: string | null };

  if (categoryId === undefined) {
    res.status(400).json({ error: "categoryId is required" });
    return;
  }

  const accountIds = await getUserAccountIds(userId);
  const [existing] = accountIds.length
    ? await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          and(
            eq(transactions.id, id),
            inArray(transactions.financialAccountId, accountIds),
          ),
        )
    : [];

  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (categoryId !== null) {
    const [category] = await db
      .select({ id: categories.id, userId: categories.userId })
      .from(categories)
      .where(eq(categories.id, categoryId));

    if (!category || (category.userId !== null && category.userId !== userId)) {
      res.status(400).json({ error: "Invalid categoryId" });
      return;
    }
  }

  const [transaction] = await db
    .update(transactions)
    .set({ categoryId, updatedAt: new Date() })
    .where(eq(transactions.id, id))
    .returning();

  res.json({ transaction });
});
