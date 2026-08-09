import { Router } from "express";
import { and, eq, gte, lte, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { budgets, categories, transactions } from "../db/schema.js";
import { requireSession } from "../middleware/requireSession.js";
import { getUserAccountIds } from "../lib/userAccounts.js";
import { getSpendingAlertStatus } from "../lib/spendingAlerts.js";

export const budgetsRouter = Router();

budgetsRouter.use(requireSession);

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthRange(month: string): { start: string; end: string } {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

budgetsRouter.get("/", async (req, res) => {
  const userId = req.session!.user.id;
  const month = (req.query.month as string) || currentMonth();

  if (!MONTH_PATTERN.test(month)) {
    res.status(400).json({ error: "month must be in YYYY-MM format" });
    return;
  }

  const rows = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.month, `${month}-01`)));

  res.json({ budgets: rows });
});

budgetsRouter.post("/", async (req, res) => {
  const userId = req.session!.user.id;
  const { categoryId, month, amount } = req.body as {
    categoryId?: string;
    month?: string;
    amount?: number | string;
  };

  if (!categoryId || !month || amount === undefined) {
    res
      .status(400)
      .json({ error: "categoryId, month, and amount are required" });
    return;
  }

  if (!MONTH_PATTERN.test(month)) {
    res.status(400).json({ error: "month must be in YYYY-MM format" });
    return;
  }

  const [category] = await db
    .select({ id: categories.id, userId: categories.userId })
    .from(categories)
    .where(eq(categories.id, categoryId));

  if (!category || (category.userId !== null && category.userId !== userId)) {
    res.status(400).json({ error: "Invalid categoryId" });
    return;
  }

  const [budget] = await db
    .insert(budgets)
    .values({
      userId,
      categoryId,
      month: `${month}-01`,
      amount: amount.toString(),
    })
    .onConflictDoUpdate({
      target: [budgets.userId, budgets.categoryId, budgets.month],
      set: { amount: amount.toString(), updatedAt: new Date() },
    })
    .returning();

  res.status(201).json({ budget });
});

budgetsRouter.delete("/:id", async (req, res) => {
  const userId = req.session!.user.id;
  const { id } = req.params;

  const [existing] = await db.select().from(budgets).where(eq(budgets.id, id));

  if (!existing || existing.userId !== userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.delete(budgets).where(eq(budgets.id, id));

  res.json({ success: true });
});

budgetsRouter.get("/progress", async (req, res) => {
  const userId = req.session!.user.id;
  const month = (req.query.month as string) || currentMonth();

  if (!MONTH_PATTERN.test(month)) {
    res.status(400).json({ error: "month must be in YYYY-MM format" });
    return;
  }

  const { start, end } = getMonthRange(month);

  const visibleCategories = await db
    .select()
    .from(categories)
    .where(or(isNull(categories.userId), eq(categories.userId, userId)));

  const budgetRows = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.month, `${month}-01`)));

  const budgetByCategory = new Map(
    budgetRows.map((b) => [b.categoryId, b.amount]),
  );

  const accountIds = await getUserAccountIds(userId);

  const spentRows = accountIds.length
    ? await db
        .select({
          categoryId: transactions.categoryId,
          total: sql<string>`sum(${transactions.amount})`,
        })
        .from(transactions)
        .where(
          and(
            inArray(transactions.financialAccountId, accountIds),
            eq(transactions.isRemoved, false),
            gte(transactions.date, start),
            lte(transactions.date, end),
          ),
        )
        .groupBy(transactions.categoryId)
    : [];

  const spentByCategory = new Map(
    spentRows
      .filter((row) => row.categoryId)
      .map((row) => [row.categoryId as string, row.total]),
  );

  const progress = visibleCategories.map((category) => {
    const budgeted = budgetByCategory.get(category.id) ?? "0";
    const spent = spentByCategory.get(category.id) ?? "0";
    return {
      categoryId: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      isDefault: category.isDefault,
      budgeted,
      spent,
      status: getSpendingAlertStatus(Number(spent), Number(budgeted)),
    };
  });

  res.json({ month, progress });
});
