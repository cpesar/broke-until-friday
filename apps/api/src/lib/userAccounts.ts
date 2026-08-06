import { eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { plaidItems, financialAccounts } from "../db/schema.js";

export async function getUserAccountIds(userId: string): Promise<string[]> {
  const items = await db
    .select({ id: plaidItems.id })
    .from(plaidItems)
    .where(eq(plaidItems.userId, userId));

  if (!items.length) return [];

  const accounts = await db
    .select({ id: financialAccounts.id })
    .from(financialAccounts)
    .where(
      inArray(
        financialAccounts.plaidItemId,
        items.map((item) => item.id),
      ),
    );

  return accounts.map((account) => account.id);
}
