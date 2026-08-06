import { createHash } from "node:crypto";
import { decodeProtectedHeader, importJWK, jwtVerify } from "jose";
import { plaidClient } from "./plaid.js";

const keyCache = new Map<string, Awaited<ReturnType<typeof importJWK>>>();
const MAX_TOKEN_AGE_SECONDS = 5 * 60;

async function getVerificationKey(keyId: string) {
  const cached = keyCache.get(keyId);
  if (cached) return cached;

  const response = await plaidClient.webhookVerificationKeyGet({
    key_id: keyId,
  });
  const key = await importJWK(
    response.data.key as unknown as Parameters<typeof importJWK>[0],
    "ES256",
  );
  keyCache.set(keyId, key);
  return key;
}

export async function verifyPlaidWebhook(
  signedJwt: string | undefined,
  rawBody: Buffer,
): Promise<boolean> {
  if (!signedJwt) return false;

  try {
    const { kid } = decodeProtectedHeader(signedJwt);
    if (!kid) return false;

    const key = await getVerificationKey(kid);
    const { payload } = await jwtVerify(signedJwt, key, {
      maxTokenAge: MAX_TOKEN_AGE_SECONDS,
    });

    const bodyHash = createHash("sha256").update(rawBody).digest("hex");
    return payload.request_body_sha256 === bodyHash;
  } catch {
    return false;
  }
}
