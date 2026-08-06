import { isNull, eq, and } from "drizzle-orm";
import { db } from "./client.js";
import { categories } from "./schema.js";

const DEFAULT_CATEGORIES = [
  { pfc: "INCOME", name: "Income", icon: "💰", color: "#22c55e" },
  { pfc: "TRANSFER_IN", name: "Transfers In", icon: "⬇️", color: "#38bdf8" },
  { pfc: "TRANSFER_OUT", name: "Transfers Out", icon: "⬆️", color: "#38bdf8" },
  { pfc: "LOAN_PAYMENTS", name: "Loan Payments", icon: "🏦", color: "#f97316" },
  { pfc: "BANK_FEES", name: "Bank Fees", icon: "🏛️", color: "#ef4444" },
  { pfc: "ENTERTAINMENT", name: "Entertainment", icon: "🎬", color: "#a855f7" },
  { pfc: "FOOD_AND_DRINK", name: "Food & Drink", icon: "🍔", color: "#f59e0b" },
  { pfc: "GENERAL_MERCHANDISE", name: "Shopping", icon: "🛍️", color: "#ec4899" },
  { pfc: "HOME_IMPROVEMENT", name: "Home Improvement", icon: "🏠", color: "#84cc16" },
  { pfc: "MEDICAL", name: "Medical", icon: "🩺", color: "#06b6d4" },
  { pfc: "PERSONAL_CARE", name: "Personal Care", icon: "💆", color: "#f472b6" },
  { pfc: "GENERAL_SERVICES", name: "Services", icon: "🔧", color: "#64748b" },
  {
    pfc: "GOVERNMENT_AND_NON_PROFIT",
    name: "Government & Non-Profit",
    icon: "🏛️",
    color: "#6366f1",
  },
  { pfc: "TRANSPORTATION", name: "Transportation", icon: "🚗", color: "#0ea5e9" },
  { pfc: "TRAVEL", name: "Travel", icon: "✈️", color: "#14b8a6" },
  {
    pfc: "RENT_AND_UTILITIES",
    name: "Rent & Utilities",
    icon: "🧾",
    color: "#78716c",
  },
] as const;

export async function seedDefaultCategories() {
  const existing = await db
    .select({ pfc: categories.plaidPersonalFinanceCategory })
    .from(categories)
    .where(and(eq(categories.isDefault, true), isNull(categories.userId)));

  const existingPfcs = new Set(existing.map((row) => row.pfc));
  const missing = DEFAULT_CATEGORIES.filter((c) => !existingPfcs.has(c.pfc));

  for (const c of missing) {
    try {
      await db.insert(categories).values({
        userId: null,
        name: c.name,
        icon: c.icon,
        color: c.color,
        plaidPersonalFinanceCategory: c.pfc,
        isDefault: true,
      });
    } catch (err: unknown) {
      const e = err as { code?: string; cause?: { code?: string } };
      const code = e.code ?? e.cause?.code;
      if (code !== "23505") throw err;
    }
  }
}
