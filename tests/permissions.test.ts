import { describe, expect, it } from "vitest";
import { canRespond, studentStatus } from "@/lib/permissions";

const now = new Date("2026-11-02T12:00:00Z");
const inHours = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000);

describe("studentStatus", () => {
  it("is pending without responses", () => {
    expect(studentStatus([])).toBe("PENDING");
  });

  it("is authorized when one guardian says yes", () => {
    expect(studentStatus(["AUTHORIZED"])).toBe("AUTHORIZED");
    expect(studentStatus(["AUTHORIZED", "AUTHORIZED"])).toBe("AUTHORIZED");
  });

  it("is denied when guardians only say no", () => {
    expect(studentStatus(["DENIED"])).toBe("DENIED");
  });

  it("is a conflict when guardians disagree", () => {
    expect(studentStatus(["AUTHORIZED", "DENIED"])).toBe("CONFLICT");
  });
});

describe("canRespond", () => {
  it("accepts answers only while open and before the deadline", () => {
    expect(canRespond({ status: "OPEN", deadline: inHours(1) }, now)).toBe(true);
    expect(canRespond({ status: "OPEN", deadline: inHours(-1) }, now)).toBe(false);
    expect(canRespond({ status: "DRAFT", deadline: inHours(1) }, now)).toBe(false);
    expect(canRespond({ status: "CLOSED", deadline: inHours(1) }, now)).toBe(false);
  });
});
