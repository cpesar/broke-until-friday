import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useBudgetProgress } from "@/hooks/useBudgetProgress";
import { currentMonth } from "@/lib/month";
import { warningBadgeStyle } from "@/lib/spendingAlertColors";

export function SpendingAlertsBanner() {
  const { data: progress = [] } = useBudgetProgress(currentMonth());
  const alerts = progress.filter((p) => p.status !== "ok");

  if (alerts.length === 0) return null;

  return (
    <Card className="w-full border-destructive/30">
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm font-medium">
          {alerts.length === 1
            ? "1 category is near or over its budget cap this month."
            : `${alerts.length} categories are near or over their budget cap this month.`}
        </p>
        <div className="flex flex-wrap gap-2">
          {alerts.map((p) => (
            <Badge
              key={p.categoryId}
              variant={p.status === "over" ? "destructive" : "outline"}
              style={warningBadgeStyle(p.status)}
            >
              {p.icon ? `${p.icon} ` : ""}
              {p.name}
            </Badge>
          ))}
        </div>
        <Link to="/budgets" className="text-sm text-primary underline-offset-4 hover:underline">
          Review budgets →
        </Link>
      </CardContent>
    </Card>
  );
}
