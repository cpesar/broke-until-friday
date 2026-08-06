import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/AuthCard";
import { PlaidConnect } from "@/components/PlaidConnect";
import { TransactionsList } from "@/components/TransactionsList";
import { authClient } from "@/lib/auth-client";

function App() {
  const { data: session, isPending } = authClient.useSession();
  const [meCheck, setMeCheck] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setMeCheck(null);
      return;
    }
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => setMeCheck(`Server confirmed: ${data.user.email}`))
      .catch(() => setMeCheck("Server rejected the session"));
  }, [session]);

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4">
        <AuthCard />
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Welcome, {session.user.name}</h1>
      <p className="text-muted-foreground text-sm">{session.user.email}</p>
      <p className="text-muted-foreground text-sm">{meCheck ?? "Checking with server…"}</p>
      <PlaidConnect />
      <TransactionsList />
      <Button
        variant="outline"
        onClick={async () => {
          await authClient.signOut();
          window.location.href = "/";
        }}
      >
        Sign out
      </Button>
    </div>
  );
}

export default App;
