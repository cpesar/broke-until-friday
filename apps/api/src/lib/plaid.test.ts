import { describe, expect, it } from "vitest";
import { resolvePlaidClientId } from "./plaid.js";

describe("resolvePlaidClientId", () => {
  it("uses the production client id when PLAID_ENV is production", () => {
    const clientId = resolvePlaidClientId("production", {
      PLAID_CLIENT_ID_PRODUCTION: "prod-id",
      PLAID_CLIENT_ID_SANDBOX: "sandbox-id",
    } as NodeJS.ProcessEnv);

    expect(clientId).toBe("prod-id");
  });

  it("uses the sandbox client id when PLAID_ENV is sandbox", () => {
    const clientId = resolvePlaidClientId("sandbox", {
      PLAID_CLIENT_ID_PRODUCTION: "prod-id",
      PLAID_CLIENT_ID_SANDBOX: "sandbox-id",
    } as NodeJS.ProcessEnv);

    expect(clientId).toBe("sandbox-id");
  });

  it("returns an empty string when the matching variable is unset", () => {
    const clientId = resolvePlaidClientId("production", {} as NodeJS.ProcessEnv);

    expect(clientId).toBe("");
  });
});
