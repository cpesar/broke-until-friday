import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface PlaidAccount {
  id: string;
  name: string;
  mask: string | null;
  currentBalance: string | null;
  isoCurrencyCode: string | null;
}

export interface PlaidItem {
  id: string;
  institutionName: string;
  status: string;
  accounts: PlaidAccount[];
}

const plaidItemsKey = ["plaid", "items"] as const;

async function fetchPlaidItems(): Promise<PlaidItem[]> {
  const res = await fetch("/api/plaid/items");
  if (!res.ok) throw new Error("Failed to load Plaid items");
  const data = await res.json();
  return data.items ?? [];
}

export function usePlaidItems() {
  return useQuery({ queryKey: plaidItemsKey, queryFn: fetchPlaidItems });
}

export function useCreatePlaidLinkToken() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/plaid/link-token", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create link token");
      const data = await res.json();
      return data.linkToken as string;
    },
  });
}

export function useExchangePlaidToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (publicToken: string) => {
      const res = await fetch("/api/plaid/exchange-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicToken }),
      });
      if (!res.ok) throw new Error("Failed to exchange public token");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plaidItemsKey });
    },
  });
}

export function useRemovePlaidItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/plaid/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove Plaid item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plaidItemsKey });
    },
  });
}
