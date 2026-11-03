import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "@/lib/tokens";

const KEY = "unit-test-key";
const NOW = 1_800_000_000_000;

describe("signed tokens", () => {
  it("round-trips the subject for the same purpose", () => {
    const token = signToken("guardian-1", "pass", 60_000, NOW, KEY);
    expect(verifyToken(token, "pass", NOW + 1000, KEY)).toBe("guardian-1");
  });

  it("rejects expired tokens", () => {
    const token = signToken("guardian-1", "pass", 60_000, NOW, KEY);
    expect(verifyToken(token, "pass", NOW + 60_001, KEY)).toBeNull();
  });

  it("rejects tokens issued for another purpose", () => {
    const token = signToken("user-1", "session", 60_000, NOW, KEY);
    expect(verifyToken(token, "pass", NOW, KEY)).toBeNull();
  });

  it("rejects tampered payloads and foreign keys", () => {
    const token = signToken("guardian-1", "pass", 60_000, NOW, KEY);
    const [, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "guardian-2", purpose: "pass", exp: NOW + 60_000 })).toString("base64url");
    expect(verifyToken(`${forged}.${signature}`, "pass", NOW, KEY)).toBeNull();
    expect(verifyToken(token, "pass", NOW, "other-key")).toBeNull();
    expect(verifyToken("garbage", "pass", NOW, KEY)).toBeNull();
  });
});
