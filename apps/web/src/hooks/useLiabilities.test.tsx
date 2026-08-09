import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useLiabilities } from "./useLiabilities";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useLiabilities", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns credit accounts and items needing reconnect", async () => {
    const creditAccounts = [
      {
        accountId: "acc-1",
        name: "Freedom",
        mask: "1234",
        institutionName: "Chase",
        currentBalance: 100,
        creditLimit: 1000,
        isoCurrencyCode: "USD",
        isOverdue: false,
        lastStatementBalance: 90,
        minimumPaymentAmount: 25,
        nextPaymentDueDate: "2026-09-01",
        aprPercentage: 19.99,
        aprType: "purchase_apr",
      },
    ];
    const itemsNeedingReconnect = [{ id: "item-1", institutionName: "Amex" }];
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ creditAccounts, itemsNeedingReconnect }), { status: 200 }),
    );

    const { result } = renderHook(() => useLiabilities(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ creditAccounts, itemsNeedingReconnect });
    expect(fetch).toHaveBeenCalledWith("/api/liabilities");
  });

  it("defaults to empty arrays when fields are missing from the response", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

    const { result } = renderHook(() => useLiabilities(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ creditAccounts: [], itemsNeedingReconnect: [] });
  });

  it("surfaces an error when the request fails", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }));

    const { result } = renderHook(() => useLiabilities(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
