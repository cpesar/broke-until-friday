import { eq, and, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { plaidItems, financialAccounts, transactions } from "../db/schema.js";
import { plaidClient } from "../lib/plaid.js";
import { decrypt } from "./encryption.js";

type PlaidItemRow = typeof plaidItems.$inferSelect;

export async function syncTransactionsForItem(item: PlaidItemRow) {
  const accessToken = decrypt(item.accessTokenEncrypted);
  const accounts = await db
    .select()
    .from(financialAccounts)
    .where(eq(financialAccounts.plaidItemId, item.id));

  const accountIdByPlaidId = new Map(
    accounts.map((account) => [account.plaidAccountId, account.id]),
  );

  let cursor = item.cursor ?? undefined;
  let hasMore = true;
  let added = 0;
  let modified = 0;
  let removed = 0;

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor,
    });
    const data = response.data;

    for (const txn of [...data.added, ...data.modified]) {
      const financialAccountId = accountIdByPlaidId.get(txn.account_id);
      if (!financialAccountId) continue;

      await db
        .insert(transactions)
        .values({
          financialAccountId,
          plaidTransactionId: txn.transaction_id,
          amount: txn.amount.toString(),
          isoCurrencyCode: txn.iso_currency_code ?? "USD",
          date: txn.date,
          authorizedDate: txn.authorized_date ?? null,
          name: txn.name,
          merchantName: txn.merchant_name ?? null,
          pending: txn.pending,
          plaidPfcPrimary: txn.personal_finance_category?.primary ?? null,
          plaidPfcDetailed: txn.personal_finance_category?.detailed ?? null,
          isRemoved: false,
          removedAt: null,
          raw: txn,
        })
        .onConflictDoUpdate({
          target: transactions.plaidTransactionId,
          set: {
            amount: txn.amount.toString(),
            isoCurrencyCode: txn.iso_currency_code ?? "USD",
            date: txn.date,
            authorizedDate: txn.authorized_date ?? null,
            name: txn.name,
            merchantName: txn.merchant_name ?? null,
            pending: txn.pending,
            plaidPfcPrimary: txn.personal_finance_category?.primary ?? null,
            plaidPfcDetailed: txn.personal_finance_category?.detailed ?? null,
            isRemoved: false,
            removedAt: null,
            raw: txn,
            updatedAt: new Date(),
          },
        });
    }
    added += data.added.length;
    modified += data.modified.length;

    const removedIds = data.removed
      .map((txn) => txn.transaction_id)
      .filter((id): id is string => Boolean(id));
    if (removedIds.length) {
      await db
        .update(transactions)
        .set({ isRemoved: true, removedAt: new Date() })
        .where(
          and(
            inArray(transactions.plaidTransactionId, removedIds),
            eq(transactions.isRemoved, false),
          ),
        );
      removed += removedIds.length;
    }

    cursor = data.next_cursor;
    hasMore = data.has_more;
  }

  await db
    .update(plaidItems)
    .set({ cursor, updatedAt: new Date() })
    .where(eq(plaidItems.id, item.id));

  return { added, modified, removed };
}
