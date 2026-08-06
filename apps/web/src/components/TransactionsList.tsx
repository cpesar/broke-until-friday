import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

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

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
        <CardDescription>
          {syncMessage ?? "Pull the latest activity from Plaid."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button onClick={syncNow} disabled={syncing}>
          {syncing ? "Syncing…" : "Sync now"}
        </Button>

        <div className="flex gap-2">
          <Input
            placeholder="New category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <Button variant="outline" onClick={addCategory}>
            Add
          </Button>
        </div>

        {transactions.length === 0 && (
          <p className="text-muted-foreground text-sm">No transactions yet.</p>
        )}
        <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
          {transactions.map((txn) => (
            <div
              key={txn.id}
              className="flex flex-col gap-2 rounded-md border p-2 text-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{txn.merchantName ?? txn.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {txn.date}
                    {txn.pending ? " · pending" : ""}
                  </p>
                </div>
                <span>
                  {txn.amount} {txn.isoCurrencyCode}
                </span>
              </div>
              <select
                className="border-input bg-background rounded-md border px-2 py-1 text-xs"
                value={txn.categoryId ?? ""}
                onChange={(e) => setCategory(txn.id, e.target.value)}
              >
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon ? `${category.icon} ` : ""}
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
