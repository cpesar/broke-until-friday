import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { plaidItems } from "../db/schema.js";
import { plaidClient } from "../lib/plaid.js";
import { decrypt } from "../lib/encryption.js";
import { mapCreditLiabilities, type CreditAccountView } from "../lib/liabilities.js";
import { requireSession } from "../middleware/requireSession.js";

export const liabilitiesRouter = Router();

liabilitiesRouter.use(requireSession);

liabilitiesRouter.get("/", async (req, res) => {
  const userId = req.session!.user.id;

  const items = await db
    .select()
    .from(plaidItems)
    .where(eq(plaidItems.userId, userId));

  const creditAccounts: CreditAccountView[] = [];
  const itemsNeedingReconnect = [];

  for (const item of items) {
    const accessToken = decrypt(item.accessTokenEncrypted);
    try {
      const [liabilitiesRes, accountsRes] = await Promise.all([
        plaidClient.liabilitiesGet({ access_token: accessToken }),
        plaidClient.accountsGet({ access_token: accessToken }),
      ]);

      creditAccounts.push(
        ...mapCreditLiabilities(
          item.institutionName,
          liabilitiesRes.data.liabilities.credit ?? [],
          accountsRes.data.accounts,
        ),
      );
    } catch {
      itemsNeedingReconnect.push({ id: item.id, institutionName: item.institutionName });
    }
  }

  res.json({ creditAccounts, itemsNeedingReconnect });
});
