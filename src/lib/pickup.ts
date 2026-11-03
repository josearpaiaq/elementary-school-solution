import { prisma } from "@/lib/db";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";

export const APPROVAL_TTL_MS = 15 * 60 * 1000;

type ApprovalState = { status: string; createdAt: Date; completedAt: Date | null };

export function currentApprovalStatus(approval: ApprovalState, now: Date): ApprovalStatus {
  const status = approval.status as ApprovalStatus;
  if (status === "PENDING" && now.getTime() - approval.createdAt.getTime() > APPROVAL_TTL_MS) return "EXPIRED";
  return status;
}

/** Applies a guardian's answer. Any "No" wins over a "Sí" until the child has been handed over. */
export function nextApprovalStatus(approval: ApprovalState, answer: "yes" | "no", now: Date): ApprovalStatus {
  const status = currentApprovalStatus(approval, now);
  if (approval.completedAt || status === "REJECTED" || status === "EXPIRED") return status;
  return answer === "no" ? "REJECTED" : "APPROVED";
}

/** Latest open approval for a student in the last hour, with expiry applied. */
export async function latestOpenApproval(studentId: string, now = new Date()) {
  const approval = await prisma.pickupApproval.findFirst({
    where: { studentId, completedAt: null, createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
  });
  if (!approval) return null;
  const status = currentApprovalStatus(approval, now);
  if (status !== approval.status) {
    await prisma.pickupApproval.update({ where: { id: approval.id }, data: { status } });
  }
  return { ...approval, status };
}
