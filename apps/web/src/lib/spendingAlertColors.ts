import type { SpendingAlertStatus } from "@/hooks/useBudgetProgress";

export const WARNING_COLOR = "oklch(0.769 0.188 70.08)";

export function warningBadgeStyle(status: SpendingAlertStatus) {
  if (status !== "warning") return undefined;
  return { color: WARNING_COLOR, borderColor: WARNING_COLOR };
}
