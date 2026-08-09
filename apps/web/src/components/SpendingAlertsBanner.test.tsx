import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { SpendingAlertsBanner } from "./SpendingAlertsBanner";

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
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

describe("SpendingAlertsBanner", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it("renders nothing when every category is within budget", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ progress: [progressRow({ status: "ok" })] }), {
        status: 200,
      }),
    );

    const { container } = renderWithProviders(<SpendingAlertsBanner />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it("lists categories that are near or over their budget cap", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          progress: [
            progressRow({ categoryId: "cat-1", name: "Groceries", spent: "85", status: "warning" }),
            progressRow({ categoryId: "cat-2", name: "Dining", spent: "150", status: "over" }),
            progressRow({ categoryId: "cat-3", name: "Rent", spent: "50", status: "ok" }),
          ],
        }),
        { status: 200 },
      ),
    );

    renderWithProviders(<SpendingAlertsBanner />);

    await waitFor(() => expect(screen.getByText(/2 categories/)).toBeTruthy());
    expect(screen.getByText(/Groceries/)).toBeTruthy();
    expect(screen.getByText(/Dining/)).toBeTruthy();
    expect(screen.queryByText(/Rent/)).toBeNull();
  });
});
