import type { AccountBase, APR, CreditCardLiability } from "plaid";

export interface CreditAccountView {
  accountId: string;
  name: string;
  mask: string | null;
  institutionName: string;
  currentBalance: number | null;
  creditLimit: number | null;
  isoCurrencyCode: string;
  isOverdue: boolean | null;
  lastStatementBalance: number | null;
  minimumPaymentAmount: number | null;
  nextPaymentDueDate: string | null;
  aprPercentage: number | null;
  aprType: string | null;
}

export function selectApr(aprs: APR[]): APR | null {
  return aprs.find((apr) => apr.apr_type === "purchase_apr") ?? aprs[0] ?? null;
}

export function mapCreditLiabilities(
  institutionName: string,
  credits: CreditCardLiability[],
  accounts: AccountBase[],
): CreditAccountView[] {
  const accountsById = new Map(accounts.map((account) => [account.account_id, account]));
  const result: CreditAccountView[] = [];

  for (const credit of credits) {
    const account = credit.account_id ? accountsById.get(credit.account_id) : undefined;
    if (!account) continue;

    const apr = selectApr(credit.aprs);

    result.push({
      accountId: account.account_id,
      name: account.name,
      mask: account.mask,
      institutionName,
      currentBalance: account.balances.current,
      creditLimit: account.balances.limit,
      isoCurrencyCode: account.balances.iso_currency_code ?? "USD",
      isOverdue: credit.is_overdue,
      lastStatementBalance: credit.last_statement_balance,
      minimumPaymentAmount: credit.minimum_payment_amount,
      nextPaymentDueDate: credit.next_payment_due_date,
      aprPercentage: apr?.apr_percentage ?? null,
      aprType: apr?.apr_type ?? null,
    });
  }

  return result;
}
