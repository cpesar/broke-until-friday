import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Connected accounts</CardTitle>
        <CardDescription>Link a bank account via Plaid Sandbox.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No accounts connected yet.
          </p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-1 rounded-md border p-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{item.institutionName}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeItem(item.id)}
              >
                Remove
              </Button>
            </div>
            {item.accounts.map((account) => (
              <p key={account.id} className="text-muted-foreground text-sm">
                {account.name} ({account.mask}) —{" "}
                {account.currentBalance ?? "—"} {account.isoCurrencyCode}
              </p>
            ))}
          </div>
        ))}
        <Button onClick={createLinkToken} disabled={loading}>
          {loading ? "Connecting…" : "Connect a bank"}
        </Button>
      </CardContent>
    </Card>
  );
}
