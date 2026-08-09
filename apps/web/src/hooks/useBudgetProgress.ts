import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type SpendingAlertStatus = "ok" | "warning" | "over";

export interface CategoryProgress {
  categoryId: string;
  name: string;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  budgeted: string;
  spent: string;
  status: SpendingAlertStatus;
}

interface SaveBudgetInput {
  categoryId: string;
  month: string;
  amount: string;
}

function budgetProgressKey(month: string) {
  return ["budgets", "progress", month] as const;
}

async function fetchBudgetProgress(month: string): Promise<CategoryProgress[]> {
  const res = await fetch(`/api/budgets/progress?month=${month}`);
  if (!res.ok) throw new Error("Failed to load budget progress");
  const data = await res.json();
  return data.progress ?? [];
}

export function useBudgetProgress(month: string) {
  return useQuery({
    queryKey: budgetProgressKey(month),
    queryFn: () => fetchBudgetProgress(month),
  });
}

export function useSaveBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ categoryId, month, amount }: SaveBudgetInput) => {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, month, amount }),
      });
      if (!res.ok) throw new Error("Failed to save budget");
      return res.json();
    },
    onSuccess: (_data, { month }) => {
      queryClient.invalidateQueries({ queryKey: budgetProgressKey(month) });
    },
  });
}
