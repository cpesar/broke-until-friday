import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

export function resolvePlaidClientId(
  plaidEnv: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  return (
    (plaidEnv === "production"
      ? env.PLAID_CLIENT_ID_PRODUCTION
      : env.PLAID_CLIENT_ID_SANDBOX) ?? ""
  );
}

const env = process.env.PLAID_ENV ?? "sandbox";

const configuration = new Configuration({
  basePath: PlaidEnvironments[env as keyof typeof PlaidEnvironments],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": resolvePlaidClientId(env),
      "PLAID-SECRET": process.env.PLAID_SECRET ?? "",
    },
  },
});

export const plaidClient = new PlaidApi(configuration);
