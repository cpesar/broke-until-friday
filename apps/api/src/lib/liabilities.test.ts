import { describe, expect, it } from "vitest";
import type { AccountBase, APR, CreditCardLiability } from "plaid";
import { mapCreditLiabilities, selectApr } from "./liabilities.js";

function apr(overrides: Partial<APR>): APR {
  return {
    apr_percentage: 0,
    apr_type: "purchase_apr" as APR["apr_type"],
    balance_subject_to_apr: null,
    interest_charge_amount: null,
    ...overrides,
  };
}

function creditLiability(overrides: Partial<CreditCardLiability>): CreditCardLiability {
  return {
    account_id: "account-1",
    aprs: [],
    is_overdue: false,
    last_payment_amount: null,
    last_payment_date: null,
    last_statement_issue_date: null,
    last_statement_balance: null,
    minimum_payment_amount: null,
    next_payment_due_date: null,
    ...overrides,
  };
}

function account(overrides: Partial<AccountBase>): AccountBase {
  return {
    account_id: "account-1",
    balances: {
      available: null,
      current: null,
      limit: null,
      iso_currency_code: "USD",
      unofficial_currency_code: null,
    },
    mask: "1234",
    name: "Test Card",
    official_name: null,
    type: "credit" as AccountBase["type"],
    subtype: null,
    ...overrides,
  } as AccountBase;
}

describe("selectApr", () => {
  it("prefers the purchase_apr entry when multiple APR types are present", () => {
    const cashApr = apr({ apr_type: "cash_apr" as APR["apr_type"], apr_percentage: 25 });
    const purchaseApr = apr({ apr_type: "purchase_apr" as APR["apr_type"], apr_percentage: 19.24 });

    expect(selectApr([cashApr, purchaseApr])).toEqual(purchaseApr);
  });

  it("falls back to the first APR when no purchase_apr is present", () => {
    const cashApr = apr({ apr_type: "cash_apr" as APR["apr_type"], apr_percentage: 25 });

    expect(selectApr([cashApr])).toEqual(cashApr);
  });

  it("returns null when there are no APRs", () => {
    expect(selectApr([])).toBeNull();
  });
});

describe("mapCreditLiabilities", () => {
  it("merges a credit liability with its matching account", () => {
    const credit = creditLiability({
      account_id: "account-1",
      minimum_payment_amount: 25,
      next_payment_due_date: "2026-09-01",
      aprs: [apr({ apr_type: "purchase_apr" as APR["apr_type"], apr_percentage: 19.24 })],
    });
    const acct = account({
      account_id: "account-1",
      balances: {
        available: null,
        current: 410,
        limit: 2000,
        iso_currency_code: "USD",
        unofficial_currency_code: null,
      },
    });

    const result = mapCreditLiabilities("First Gingham Credit Union", [credit], [acct]);

    expect(result).toEqual([
      {
        accountId: "account-1",
        name: "Test Card",
        mask: "1234",
        institutionName: "First Gingham Credit Union",
        currentBalance: 410,
        creditLimit: 2000,
        isoCurrencyCode: "USD",
        isOverdue: false,
        lastStatementBalance: null,
        minimumPaymentAmount: 25,
        nextPaymentDueDate: "2026-09-01",
        aprPercentage: 19.24,
        aprType: "purchase_apr",
      },
    ]);
  });

  it("skips a credit liability with no matching account", () => {
    const credit = creditLiability({ account_id: "missing-account" });
    const acct = account({ account_id: "account-1" });

    expect(mapCreditLiabilities("Bank", [credit], [acct])).toEqual([]);
  });

  it("skips a credit liability with a null account_id", () => {
    const credit = creditLiability({ account_id: null });
    const acct = account({ account_id: "account-1" });

    expect(mapCreditLiabilities("Bank", [credit], [acct])).toEqual([]);
  });
});
