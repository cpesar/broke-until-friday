import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
}

export function TransactionsList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadTransactions = useCallback(() => {
    fetch("/api/transactions")
      .then((res) => res.json())
      .then((data) => setTransactions(data.transactions ?? []));
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

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

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
        <CardDescription>{syncMessage ?? "Pull the latest activity from Plaid."}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button onClick={syncNow} disabled={syncing}>
          {syncing ? "Syncing…" : "Sync now"}
        </Button>
        {transactions.length === 0 && (
          <p className="text-muted-foreground text-sm">No transactions yet.</p>
        )}
        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {transactions.map((txn) => (
            <div
              key={txn.id}
              className="flex items-center justify-between rounded-md border p-2 text-sm"
            >
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
