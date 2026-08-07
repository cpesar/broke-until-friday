import { useEffect, useState } from "react";
import { PlaidConnect } from "@/components/PlaidConnect";
import { authClient } from "@/lib/auth-client";

export function DashboardPage() {
  const { data: session } = authClient.useSession();
  const [meCheck, setMeCheck] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => setMeCheck(`Server confirmed: ${data.user.email}`))
      .catch(() => setMeCheck("Server rejected the session"));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome, {session?.user.name}
        </h1>
        <p className="text-muted-foreground text-sm">
          {meCheck ?? "Checking with server…"}
        </p>
      </div>
      <PlaidConnect />
    </div>
  );
}
