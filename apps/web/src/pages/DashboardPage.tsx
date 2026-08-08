import { PlaidConnect } from "@/components/PlaidConnect";
import { authClient } from "@/lib/auth-client";

export function DashboardPage() {
  const { data: session } = authClient.useSession();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Welcome, {session?.user.name}</h1>
      <PlaidConnect />
    </div>
  );
}
