import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { BudgetsView } from "./BudgetsView";

function renderWithClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

function progressRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    categoryId: "cat-1",
    name: "Groceries",
    icon: "🛒",
    color: "#00ff00",
    isDefault: true,
    budgeted: "100",
    spent: "50",
    status: "ok",
    ...overrides,
  };
}

describe("BudgetsView", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it("does not show an alert badge when spending is within budget", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ progress: [progressRow({ status: "ok" })] }), {
        status: 200,
      }),
    );

    renderWithClient(<BudgetsView />);

    await waitFor(() => expect(screen.getByText(/Groceries/)).toBeTruthy());
    expect(screen.queryByText("Near limit")).toBeNull();
    expect(screen.queryByText("Over budget")).toBeNull();
  });

  it("shows a Near limit badge when spending crosses the warning threshold", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          progress: [progressRow({ spent: "85", status: "warning" })],
        }),
        { status: 200 },
      ),
    );

    renderWithClient(<BudgetsView />);

    await waitFor(() => expect(screen.getByText("Near limit")).toBeTruthy());
    expect(screen.queryByText("Over budget")).toBeNull();
  });

  it("shows an Over budget badge when spending exceeds the budget cap", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          progress: [progressRow({ spent: "150", status: "over" })],
        }),
        { status: 200 },
      ),
    );

    renderWithClient(<BudgetsView />);

    await waitFor(() => expect(screen.getByText("Over budget")).toBeTruthy());
    expect(screen.queryByText("Near limit")).toBeNull();
  });
});
