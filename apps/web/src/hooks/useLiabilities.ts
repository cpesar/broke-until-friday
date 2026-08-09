import { useQuery } from "@tanstack/react-query";

export interface CreditAccount {
  accountId: string;
  name: string;
  mask: string | null;
  institutionName: string;
  currentBalance: number | null;
  creditLimit: number | null;
  isoCurrencyCode: string;
  isOverdue: boolean | null;
  lastStatementBalance: number | null;
  minimumPaymentAmount: number | null;
  nextPaymentDueDate: string | null;
  aprPercentage: number | null;
  aprType: string | null;
}

export interface ItemNeedingReconnect {
  id: string;
  institutionName: string;
}

interface LiabilitiesResponse {
  creditAccounts: CreditAccount[];
  itemsNeedingReconnect: ItemNeedingReconnect[];
}

async function fetchLiabilities(): Promise<LiabilitiesResponse> {
  const res = await fetch("/api/liabilities");
  if (!res.ok) throw new Error("Failed to load liabilities");
  const data = await res.json();
  return {
    creditAccounts: data.creditAccounts ?? [],
    itemsNeedingReconnect: data.itemsNeedingReconnect ?? [],
  };
}

export function useLiabilities() {
  return useQuery({ queryKey: ["liabilities"], queryFn: fetchLiabilities });
}
