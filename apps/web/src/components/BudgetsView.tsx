import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  useBudgetProgress,
  useSaveBudget,
  type SpendingAlertStatus,
} from "@/hooks/useBudgetProgress";
import { currentMonth } from "@/lib/month";
import { WARNING_COLOR, warningBadgeStyle } from "@/lib/spendingAlertColors";

function shiftMonth(month: string, delta: number): string {
  const [year, monthNum] = month.split("-").map(Number);
  const date = new Date(year, monthNum - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(month: string): string {
  const [year, monthNum] = month.split("-").map(Number);
  return new Date(year, monthNum - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function progressColor(status: SpendingAlertStatus, categoryColor: string | null) {
  if (status === "over") return "var(--destructive)";
  if (status === "warning") return WARNING_COLOR;
  return categoryColor ?? "var(--primary)";
}

export function BudgetsView() {
  const [month, setMonth] = useState(currentMonth());
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const { data: progress = [] } = useBudgetProgress(month);
  const saveBudget = useSaveBudget();

  function handleBlur(categoryId: string, amount: string) {
    if (amount === "") return;
    saveBudget.mutate(
      { categoryId, month, amount },
      {
        onSuccess: () => {
          setDrafts((d) => {
            const { [categoryId]: _removed, ...rest } = d;
            return rest;
          });
        },
      },
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setMonth((m) => shiftMonth(m, -1))}>
            ←
          </Button>
          <CardTitle>{formatMonth(month)}</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setMonth((m) => shiftMonth(m, 1))}>
            →
          </Button>
        </div>
        <CardDescription>Set a budget per category.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {progress.map((p) => {
            const budgeted = Number(p.budgeted);
            const spent = Number(p.spent);
            const pct = budgeted > 0 ? Math.min(100, Math.max(0, (spent / budgeted) * 100)) : 0;
            const draft = drafts[p.categoryId] ?? p.budgeted;
            const barColor = progressColor(p.status, p.color);
            return (
              <div key={p.categoryId} className="flex flex-col gap-2 rounded-xl bg-card p-3.5 text-sm ring-1 ring-foreground/10">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="gap-1.5">
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: p.color ?? "var(--muted-foreground)" }}
                    />
                    {p.icon ? `${p.icon} ` : ""}
                    {p.name}
                  </Badge>
                  <Input
                    className="h-7 w-20 text-right"
                    value={draft}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [p.categoryId]: e.target.value }))
                    }
                    onBlur={() => handleBlur(p.categoryId, drafts[p.categoryId] ?? p.budgeted)}
                  />
                </div>
                {p.status !== "ok" && (
                  <Badge
                    variant={p.status === "over" ? "destructive" : "outline"}
                    style={warningBadgeStyle(p.status)}
                  >
                    {p.status === "over" ? "Over budget" : "Near limit"}
                  </Badge>
                )}
                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="h-full"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
                <span className="text-muted-foreground text-xs">
                  {spent.toFixed(2)} spent of {budgeted.toFixed(2)} budgeted
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
