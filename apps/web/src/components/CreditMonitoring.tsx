import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLiabilities } from "@/hooks/useLiabilities";

function formatCurrency(amount: number | null, currencyCode: string) {
  if (amount === null) return "—";
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: currencyCode,
  });
}

function formatDate(date: string | null) {
  if (!date) return "—";
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function utilizationColor(pct: number) {
  if (pct >= 70) return "var(--destructive)";
  if (pct >= 30) return "oklch(0.769 0.188 70.08)";
  return "var(--color-positive)";
}

export function CreditMonitoring() {
  const { data, isLoading, isFetching, isError, refetch } = useLiabilities();
  const creditAccounts = data?.creditAccounts ?? [];
  const itemsNeedingReconnect = data?.itemsNeedingReconnect ?? [];
  console.log(data, "data");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Credit</h1>
          <p className="text-sm text-muted-foreground">
            Card balances, APRs, and payment due dates from your linked
            accounts.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {isError && (
        <p className="text-sm text-destructive">
          Couldn't load credit accounts. Try refreshing.
        </p>
      )}

      {itemsNeedingReconnect.length > 0 && (
        <div className="rounded-xl bg-accent p-4 text-sm text-accent-foreground">
          {itemsNeedingReconnect.map((i) => i.institutionName).join(", ")}{" "}
          {itemsNeedingReconnect.length === 1 ? "needs" : "need"} to be
          reconnected to enable credit monitoring. Remove and re-add the account
          from the{" "}
          <Link to="/" className="underline underline-offset-2">
            Dashboard
          </Link>
          .
        </div>
      )}

      {!isLoading &&
        creditAccounts.length === 0 &&
        itemsNeedingReconnect.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No credit cards connected yet.
          </p>
        )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {creditAccounts.map((card) => {
          const pct =
            card.creditLimit && card.creditLimit > 0
              ? Math.min(
                  100,
                  Math.max(
                    0,
                    ((card.currentBalance ?? 0) / card.creditLimit) * 100,
                  ),
                )
              : null;

          return (
            <div
              key={card.accountId}
              className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
            >
              <div>
                <p className="text-sm text-muted-foreground">
                  {card.institutionName} · {card.mask ?? "····"}
                </p>
                <p className="font-medium">{card.name}</p>
              </div>

              <div>
                <p className="text-2xl font-semibold tracking-tight">
                  {formatCurrency(card.currentBalance, card.isoCurrencyCode)}
                </p>
                {card.creditLimit && (
                  <p className="text-xs text-muted-foreground">
                    of {formatCurrency(card.creditLimit, card.isoCurrencyCode)}{" "}
                    limit
                  </p>
                )}
              </div>

              {pct !== null && (
                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="h-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: utilizationColor(pct),
                    }}
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                {card.aprPercentage !== null && (
                  <Badge variant="secondary">
                    {card.aprPercentage.toFixed(2)}%{" "}
                    {card.aprType === "purchase_apr"
                      ? "purchase"
                      : card.aprType}{" "}
                    APR
                  </Badge>
                )}
                {card.isOverdue && <Badge variant="destructive">Overdue</Badge>}
              </div>

              <div
                className={`flex items-center justify-between text-sm ${card.isOverdue ? "text-destructive" : ""}`}
              >
                <span className="text-muted-foreground">Min. payment due</span>
                <span className="font-medium">
                  {formatCurrency(
                    card.minimumPaymentAmount,
                    card.isoCurrencyCode,
                  )}{" "}
                  on {formatDate(card.nextPaymentDueDate)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
