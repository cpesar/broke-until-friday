import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useBudgetProgress, useSaveBudget } from "./useBudgetProgress";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    Wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
    queryClient,
  };
}

describe("useBudgetProgress", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns category progress including alert status", async () => {
    const progress = [
      {
        categoryId: "cat-1",
        name: "Groceries",
        icon: "🛒",
        color: "#00ff00",
        isDefault: true,
        budgeted: "100",
        spent: "85",
        status: "warning",
      },
    ];
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ month: "2026-08", progress }), { status: 200 }),
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBudgetProgress("2026-08"), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(progress);
    expect(fetch).toHaveBeenCalledWith("/api/budgets/progress?month=2026-08");
  });

  it("defaults to an empty array when progress is missing from the response", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBudgetProgress("2026-08"), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("surfaces an error when the request fails", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBudgetProgress("2026-08"), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useSaveBudget", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the budget and invalidates that month's progress query", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ budget: {} }), { status: 201 }),
    );

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useSaveBudget(), { wrapper: Wrapper });

    result.current.mutate({ categoryId: "cat-1", month: "2026-08", amount: "150" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: "cat-1", month: "2026-08", amount: "150" }),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["budgets", "progress", "2026-08"],
    });
  });

  it("surfaces an error when the save fails", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSaveBudget(), { wrapper: Wrapper });

    result.current.mutate({ categoryId: "cat-1", month: "2026-08", amount: "150" });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
