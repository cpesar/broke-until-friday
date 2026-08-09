import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  useCreatePlaidLinkToken,
  useExchangePlaidToken,
  usePlaidItems,
  useRemovePlaidItem,
} from "./usePlaid";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe("usePlaidItems", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the items from a successful response", async () => {
    const items = [{ id: "item-1", institutionName: "Chase", status: "active", accounts: [] }];
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ items }), { status: 200 }));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePlaidItems(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(items);
    expect(fetch).toHaveBeenCalledWith("/api/plaid/items");
  });

  it("defaults to an empty list when the response has no items", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePlaidItems(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("surfaces an error when the request fails", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePlaidItems(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreatePlaidLinkToken", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts to the link-token endpoint and resolves the token", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ linkToken: "link-abc" }), { status: 200 }),
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreatePlaidLinkToken(), { wrapper });

    const token = await result.current.mutateAsync();

    expect(token).toBe("link-abc");
    expect(fetch).toHaveBeenCalledWith("/api/plaid/link-token", { method: "POST" });
  });
});

describe("useExchangePlaidToken", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the public token and invalidates the plaid items query", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useExchangePlaidToken(), { wrapper });

    await result.current.mutateAsync("public-token-123");

    expect(fetch).toHaveBeenCalledWith("/api/plaid/exchange-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicToken: "public-token-123" }),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["plaid", "items"] });
  });
});

describe("useRemovePlaidItem", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deletes the item and invalidates the plaid items query", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useRemovePlaidItem(), { wrapper });

    await result.current.mutateAsync("item-1");

    expect(fetch).toHaveBeenCalledWith("/api/plaid/items/item-1", { method: "DELETE" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["plaid", "items"] });
  });
});
