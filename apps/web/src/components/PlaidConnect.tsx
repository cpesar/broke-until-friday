import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Plus, X } from "lucide-react";

interface PlaidAccount {
  id: string;
  name: string;
  mask: string | null;
  currentBalance: string | null;
  isoCurrencyCode: string | null;
}

interface PlaidItem {
  id: string;
  institutionName: string;
  status: string;
  accounts: PlaidAccount[];
}

export function PlaidConnect() {
  const [items, setItems] = useState<PlaidItem[]>([]);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadItems = useCallback(() => {
    fetch("/api/plaid/items")
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []));
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const createLinkToken = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/plaid/link-token", { method: "POST" });
    const data = await res.json();
    setLinkToken(data.linkToken);
    setLoading(false);
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess: async (publicToken) => {
      await fetch("/api/plaid/exchange-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicToken }),
      });
      setLinkToken(null);
      loadItems();
    },
  });

  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  async function removeItem(id: string) {
    await fetch(`/api/plaid/items/${id}`, { method: "DELETE" });
    loadItems();
  }

  const accounts = items.flatMap((item) =>
    item.accounts.map((account) => ({ ...account, institutionName: item.institutionName, itemId: item.id })),
  );
  const totalBalance = accounts.reduce(
    (sum, account) => sum + (account.currentBalance ? Number(account.currentBalance) : 0),
    0,
  );
  const currencyCode = accounts.find((a) => a.isoCurrencyCode)?.isoCurrencyCode ?? "USD";

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-primary/10 p-6 ring-1 ring-primary/15">
        <p className="text-sm text-muted-foreground">Total balance</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight">
          {totalBalance.toLocaleString(undefined, { style: "currency", currency: currencyCode })}
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Accounts</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(
            accounts.reduce<Record<string, { itemId: string; institutionName: string; accounts: typeof accounts }>>(
              (groups, account) => {
                const group = groups[account.itemId] ?? {
                  itemId: account.itemId,
                  institutionName: account.institutionName,
                  accounts: [],
                };
                group.accounts.push(account);
                groups[account.itemId] = group;
                return groups;
              },
              {},
            ),
          ).map(([itemId, group]) => (
            <div key={itemId} className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {group.institutionName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="font-medium">{group.institutionName}</span>
                </div>
                <button
                  type="button"
                  aria-label="Remove account"
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  onClick={() => removeItem(itemId)}
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {group.accounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {account.name} · {account.mask ?? "····"}
                    </span>
                    <span className="font-medium">
                      {account.currentBalance
                        ? Number(account.currentBalance).toLocaleString(undefined, {
                            style: "currency",
                            currency: account.isoCurrencyCode ?? "USD",
                          })
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={createLinkToken}
            disabled={loading}
            className="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:pointer-events-none disabled:opacity-50"
          >
            <Plus className="size-5" />
            {loading ? "Connecting…" : "Add account"}
          </button>
        </div>
      </div>
    </div>
  );
}
