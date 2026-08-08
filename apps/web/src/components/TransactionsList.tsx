import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Transaction {
  id: string;
  date: string;
  name: string;
  merchantName: string | null;
  amount: string;
  isoCurrencyCode: string | null;
  pending: boolean;
  categoryId: string | null;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
}

export function TransactionsList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadTransactions = useCallback(() => {
    fetch("/api/transactions")
      .then((res) => res.json())
      .then((data) => setTransactions(data.transactions ?? []));
  }, []);

  const loadCategories = useCallback(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories ?? []));
  }, []);

  useEffect(() => {
    loadTransactions();
    loadCategories();
  }, [loadTransactions, loadCategories]);

  async function syncNow() {
    setSyncing(true);
    setSyncMessage(null);
    const res = await fetch("/api/transactions/sync", { method: "POST" });
    const data = (await res.json()) as {
      results: { added: number; modified: number; removed: number }[];
    };
    const totals = data.results.reduce(
      (acc, r) => ({
        added: acc.added + r.added,
        modified: acc.modified + r.modified,
        removed: acc.removed + r.removed,
      }),
      { added: 0, modified: 0, removed: 0 },
    );
    setSyncMessage(
      `Synced: +${totals.added} added, ${totals.modified} modified, ${totals.removed} removed`,
    );
    setSyncing(false);
    loadTransactions();
  }

  async function setCategory(transactionId: string, categoryId: string) {
    await fetch(`/api/transactions/${transactionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: categoryId || null }),
    });
    loadTransactions();
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName.trim() }),
    });
    setNewCategoryName("");
    loadCategories();
  }

  const categoriesById = Object.fromEntries(categories.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {syncMessage ?? "Pull the latest activity from Plaid."}
          </p>
        </div>
        <Button onClick={syncNow} disabled={syncing}>
          {syncing ? "Syncing…" : "Sync now"}
        </Button>
      </div>

      <div className="flex max-w-sm gap-2">
        <Input
          placeholder="New category name"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
        />
        <Button variant="outline" onClick={addCategory}>
          Add category
        </Button>
      </div>

      {transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No transactions yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="grid grid-cols-[110px_1fr_200px_120px] gap-4 border-b px-4 pb-2.5 pt-3 text-xs font-medium text-muted-foreground">
            <span>Date</span>
            <span>Description</span>
            <span>Category</span>
            <span className="text-right">Amount</span>
          </div>
          {transactions.map((txn) => {
            const category = txn.categoryId ? categoriesById[txn.categoryId] : undefined;
            const isInflow = Number(txn.amount) < 0;
            return (
              <div
                key={txn.id}
                className="grid grid-cols-[110px_1fr_200px_120px] items-center gap-4 border-b px-4 py-3 text-sm transition-colors last:border-b-0 hover:bg-muted/50"
              >
                <span className="text-xs text-muted-foreground">
                  {txn.date}
                  {txn.pending ? " · pending" : ""}
                </span>
                <span className="font-medium">{txn.merchantName ?? txn.name}</span>
                <div className="relative">
                  <span
                    className="pointer-events-none absolute left-2.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full"
                    style={{ backgroundColor: category?.color ?? "var(--muted-foreground)" }}
                  />
                  <select
                    className="w-full rounded-full border border-input bg-background py-1 pl-6 pr-2 text-xs"
                    value={txn.categoryId ?? ""}
                    onChange={(e) => setCategory(txn.id, e.target.value)}
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon ? `${c.icon} ` : ""}
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <span className={`text-right font-medium ${isInflow ? "text-(--color-positive)" : "text-foreground"}`}>
                  {txn.amount} {txn.isoCurrencyCode}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
