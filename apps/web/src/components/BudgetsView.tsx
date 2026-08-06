import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

interface CategoryProgress {
  categoryId: string;
  name: string;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  budgeted: string;
  spent: string;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

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

export function BudgetsView() {
  const [month, setMonth] = useState(currentMonth());
  const [progress, setProgress] = useState<CategoryProgress[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const loadProgress = useCallback((forMonth: string) => {
    fetch(`/api/budgets/progress?month=${forMonth}`)
      .then((res) => res.json())
      .then((data) => {
        setProgress(data.progress ?? []);
        setDrafts(
          Object.fromEntries(
            (data.progress ?? []).map((p: CategoryProgress) => [
              p.categoryId,
              p.budgeted,
            ]),
          ),
        );
      });
  }, []);

  useEffect(() => {
    loadProgress(month);
  }, [month, loadProgress]);

  async function saveBudget(categoryId: string) {
    const amount = drafts[categoryId];
    if (amount === undefined || amount === "") return;
    await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, month, amount }),
    });
    loadProgress(month);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
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
      <CardContent className="flex max-h-96 flex-col gap-3 overflow-y-auto">
        {progress.map((p) => {
          const budgeted = Number(p.budgeted);
          const spent = Number(p.spent);
          const pct = budgeted > 0 ? Math.min(100, Math.max(0, (spent / budgeted) * 100)) : 0;
          return (
            <div key={p.categoryId} className="flex flex-col gap-1 rounded-md border p-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {p.icon ? `${p.icon} ` : ""}
                  {p.name}
                </span>
                <div className="flex items-center gap-1">
                  <Input
                    className="h-7 w-20 text-right"
                    value={drafts[p.categoryId] ?? ""}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [p.categoryId]: e.target.value }))
                    }
                    onBlur={() => saveBudget(p.categoryId)}
                  />
                </div>
              </div>
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-muted-foreground text-xs">
                {spent.toFixed(2)} spent of {budgeted.toFixed(2)} budgeted
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
