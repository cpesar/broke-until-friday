import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { APP_NAME, type HealthCheckResponse } from "@budget-app/shared";

function App() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setError("API unreachable"));
  }, []);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">{APP_NAME}</h1>
      <p className="text-muted-foreground text-sm">
        {error ? error : health ? `API says: ${health.status}` : "Checking API…"}
      </p>
      <Button>It works</Button>
    </div>
  );
}

export default App;
