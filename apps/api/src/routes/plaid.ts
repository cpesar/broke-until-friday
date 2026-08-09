import { Router } from "express";
import { eq, inArray } from "drizzle-orm";
import { CountryCode, Products } from "plaid";
import { db } from "../db/client.js";
import { plaidItems, financialAccounts } from "../db/schema.js";
import { plaidClient } from "../lib/plaid.js";
import { encrypt, decrypt } from "../lib/encryption.js";
import { requireSession } from "../middleware/requireSession.js";

export const plaidRouter = Router();

plaidRouter.use(requireSession);

plaidRouter.post("/link-token", async (req, res) => {
  const userId = req.session!.user.id;

  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: "Broke Until Friday",
    products: [Products.Transactions, Products.Liabilities],
    country_codes: [CountryCode.Us],
    language: "en",
  });

  res.json({ linkToken: response.data.link_token });
});

plaidRouter.post("/exchange-token", async (req, res) => {
  const userId = req.session!.user.id;
  const { publicToken } = req.body as { publicToken?: string };

  if (!publicToken) {
    res.status(400).json({ error: "publicToken is required" });
    return;
  }

  const exchangeResponse = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });
  const accessToken = exchangeResponse.data.access_token;
  const plaidItemId = exchangeResponse.data.item_id;

  const itemResponse = await plaidClient.itemGet({ access_token: accessToken });
  const institutionId = itemResponse.data.item.institution_id ?? null;

  let institutionName = institutionId ?? "Unknown institution";
  if (institutionId) {
    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: [CountryCode.Us],
    });
    institutionName = institutionResponse.data.institution.name;
  }

  const accountsResponse = await plaidClient.accountsGet({
    access_token: accessToken,
  });

  const [item] = await db
    .insert(plaidItems)
    .values({
      userId,
      plaidItemId,
      accessTokenEncrypted: encrypt(accessToken),
      institutionId: institutionId ?? "unknown",
      institutionName,
    })
    .returning();

  if (!item) {
    res.status(500).json({ error: "Failed to store Plaid item" });
    return;
  }

  const accountRows = accountsResponse.data.accounts.map((account) => ({
    plaidItemId: item.id,
    plaidAccountId: account.account_id,
    name: account.name,
    officialName: account.official_name,
    type: account.type as string,
    subtype: account.subtype as string | null,
    mask: account.mask,
    currentBalance: account.balances.current?.toString() ?? null,
    availableBalance: account.balances.available?.toString() ?? null,
    isoCurrencyCode: account.balances.iso_currency_code ?? "USD",
  }));

  const accounts = accountRows.length
    ? await db.insert(financialAccounts).values(accountRows).returning()
    : [];

  res.json({ item, accounts });
});

plaidRouter.get("/items", async (req, res) => {
  const userId = req.session!.user.id;

  const items = await db
    .select({
      id: plaidItems.id,
      institutionId: plaidItems.institutionId,
      institutionName: plaidItems.institutionName,
      status: plaidItems.status,
      createdAt: plaidItems.createdAt,
    })
    .from(plaidItems)
    .where(eq(plaidItems.userId, userId));

  const accounts = items.length
    ? await db
        .select()
        .from(financialAccounts)
        .where(
          inArray(
            financialAccounts.plaidItemId,
            items.map((item) => item.id),
          ),
        )
    : [];

  res.json({
    items: items.map((item) => ({
      ...item,
      accounts: accounts.filter((account) => account.plaidItemId === item.id),
    })),
  });
});

plaidRouter.delete("/items/:id", async (req, res) => {
  const userId = req.session!.user.id;
  const { id } = req.params;

  const [item] = await db
    .select()
    .from(plaidItems)
    .where(eq(plaidItems.id, id));

  if (!item || item.userId !== userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await plaidClient.itemRemove({
    access_token: decrypt(item.accessTokenEncrypted),
  });
  await db.delete(plaidItems).where(eq(plaidItems.id, item.id));

  res.json({ success: true });
});
