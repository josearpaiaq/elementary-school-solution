import { describe, expect, it } from "vitest";
import { APPROVAL_TTL_MS, currentApprovalStatus, nextApprovalStatus } from "@/lib/pickup";

const createdAt = new Date("2026-11-02T13:00:00Z");
const later = (ms: number) => new Date(createdAt.getTime() + ms);
const pending = { status: "PENDING", createdAt, completedAt: null };

describe("live pickup approval", () => {
  it("is approved by a yes and rejected by a no", () => {
    expect(nextApprovalStatus(pending, "yes", later(1000))).toBe("APPROVED");
    expect(nextApprovalStatus(pending, "no", later(1000))).toBe("REJECTED");
  });

  it("lets a later No override a Sí", () => {
    const approved = { ...pending, status: "APPROVED" };
    expect(nextApprovalStatus(approved, "no", later(2000))).toBe("REJECTED");
  });

  it("does not let a Sí override a No", () => {
    const rejected = { ...pending, status: "REJECTED" };
    expect(nextApprovalStatus(rejected, "yes", later(2000))).toBe("REJECTED");
  });

  it("expires after 15 minutes without an answer", () => {
    expect(currentApprovalStatus(pending, later(APPROVAL_TTL_MS - 1))).toBe("PENDING");
    expect(currentApprovalStatus(pending, later(APPROVAL_TTL_MS + 1))).toBe("EXPIRED");
    expect(nextApprovalStatus(pending, "yes", later(APPROVAL_TTL_MS + 1))).toBe("EXPIRED");
  });

  it("ignores answers once the child was handed over", () => {
    const completed = { ...pending, status: "APPROVED", completedAt: later(5000) };
    expect(nextApprovalStatus(completed, "no", later(6000))).toBe("APPROVED");
  });
});
