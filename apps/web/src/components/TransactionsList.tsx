import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
        <CardDescription>
          {syncMessage ?? "Pull the latest activity from Plaid."}
        </CardDescription>
        <CardAction>
          <Button onClick={syncNow} disabled={syncing}>
            {syncing ? "Syncing…" : "Sync now"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
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

        {transactions.length === 0 && (
          <p className="text-muted-foreground text-sm">No transactions yet.</p>
        )}
        <div className="flex flex-col">
          {transactions.length > 0 && (
            <div className="text-muted-foreground grid grid-cols-[110px_1fr_220px_120px] gap-4 border-b px-2 pb-2 text-xs font-medium">
              <span>Date</span>
              <span>Description</span>
              <span>Category</span>
              <span className="text-right">Amount</span>
            </div>
          )}
          {transactions.map((txn) => (
            <div
              key={txn.id}
              className="grid grid-cols-[110px_1fr_220px_120px] items-center gap-4 border-b px-2 py-3 text-sm last:border-b-0"
            >
              <span className="text-muted-foreground text-xs">
                {txn.date}
                {txn.pending ? " · pending" : ""}
              </span>
              <span className="font-medium">{txn.merchantName ?? txn.name}</span>
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
              <span className="text-right">
                {txn.amount} {txn.isoCurrencyCode}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
