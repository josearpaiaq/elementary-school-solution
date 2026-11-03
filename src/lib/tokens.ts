import { createHmac, timingSafeEqual } from "node:crypto";

export type TokenPurpose = "session" | "pass";

export function getSecret(): string {
  const value = process.env.TOKEN_SECRET;
  if (!value) throw new Error("TOKEN_SECRET is not set");
  return value;
}

function hmac(data: string, key: string): string {
  return createHmac("sha256", key).update(data).digest("base64url");
}

/** Signs `sub` for a single purpose; the token is `<base64url payload>.<hmac>`. */
export function signToken(
  sub: string,
  purpose: TokenPurpose,
  ttlMs: number,
  now = Date.now(),
  key = getSecret(),
): string {
  const body = Buffer.from(JSON.stringify({ sub, purpose, exp: now + ttlMs })).toString("base64url");
  return `${body}.${hmac(body, key)}`;
}

/** Returns the token subject, or null when the signature, purpose or expiry is invalid. */
export function verifyToken(
  token: string,
  purpose: TokenPurpose,
  now = Date.now(),
  key = getSecret(),
): string | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const actual = Buffer.from(signature);
  const expected = Buffer.from(hmac(body, key));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.purpose !== purpose || typeof payload.exp !== "number" || payload.exp < now) return null;
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
