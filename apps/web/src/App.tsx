import { BrowserRouter, Routes, Route } from "react-router";
import { AuthCard } from "@/components/AuthCard";
import { AppLayout } from "@/components/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { BudgetsPage } from "@/pages/BudgetsPage";
import { CreditPage } from "@/pages/CreditPage";
import { authClient } from "@/lib/auth-client";
import { APP_NAME } from "@budget-app/shared";

function App() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div
        className="flex min-h-svh flex-col items-center justify-center gap-6 p-4"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, var(--accent), var(--background) 70%)",
        }}
      >
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="size-7" />
          <span className="font-heading text-lg font-semibold">{APP_NAME}</span>
        </div>
        <AuthCard />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="budgets" element={<BudgetsPage />} />
          <Route path="credit" element={<CreditPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
