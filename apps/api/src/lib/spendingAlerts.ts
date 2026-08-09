export type SpendingAlertStatus = "ok" | "warning" | "over";

export const DEFAULT_WARNING_THRESHOLD = 0.8;

export function getSpendingAlertStatus(
  spent: number,
  budgeted: number,
  warningThreshold: number = DEFAULT_WARNING_THRESHOLD,
): SpendingAlertStatus {
  if (budgeted <= 0) return "ok";
  if (spent >= budgeted) return "over";
  if (spent >= budgeted * warningThreshold) return "warning";
  return "ok";
}
