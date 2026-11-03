import { describe, expect, it } from "vitest";
import { matchesPassCode, passCode, PASS_WINDOW_MS } from "@/lib/pass";

const KEY = "unit-test-key";
const START = Math.floor(1_800_000_000_000 / PASS_WINDOW_MS) * PASS_WINDOW_MS;

describe("pickup pass codes", () => {
  it("are 6 digits and stable within a window", () => {
    const code = passCode("user-1", START, KEY);
    expect(code).toMatch(/^\d{6}$/);
    expect(passCode("user-1", START + PASS_WINDOW_MS - 1, KEY)).toBe(code);
  });

  it("differ between users and between windows", () => {
    expect(passCode("user-1", START, KEY)).not.toBe(passCode("user-2", START, KEY));
    expect(passCode("user-1", START, KEY)).not.toBe(passCode("user-1", START + PASS_WINDOW_MS, KEY));
  });

  it("accept the previous window but nothing older", () => {
    const code = passCode("user-1", START, KEY);
    expect(matchesPassCode("user-1", code, START + PASS_WINDOW_MS, KEY)).toBe(true);
    expect(matchesPassCode("user-1", code, START + 2 * PASS_WINDOW_MS, KEY)).toBe(false);
  });

  it("do not work for another user", () => {
    expect(matchesPassCode("user-2", passCode("user-1", START, KEY), START, KEY)).toBe(false);
  });
});
