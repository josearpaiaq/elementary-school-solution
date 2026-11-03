"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canAccessStudent, requireGuardian, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolvePass } from "@/lib/pass";
import { currentApprovalStatus, nextApprovalStatus } from "@/lib/pickup";

async function requireStudentAccess(studentId: string) {
  const user = await requirePermission("pickup:deliver");
  if (!(await canAccessStudent(user, studentId))) throw new Error("Forbidden");
  return user;
}

/** Hand-over after the teacher identified a registered guardian or pickup person in person. */
export async function deliverManual(studentId: string, personName: string, pickupPersonId: string | null) {
  const user = await requireStudentAccess(studentId);
  await prisma.pickupEvent.create({
    data: { studentId, personName, pickupPersonId, method: "MANUAL", teacherId: user.id },
  });
  redirect(`/pickup?student=${studentId}&done=1`);
}

/** Hand-over with a pass; the credential is verified again on the server. */
export async function deliverWithPass(credential: string, studentId: string) {
  const user = await requireStudentAccess(studentId);
  const pass = await resolvePass(credential, user);
  if (!pass || !pass.students.some((s) => s.id === studentId)) redirect(`/pickup?student=${studentId}&error=1`);

  const pickupPerson = pass.pickupPeople.find((p) => p.authorizations.some((a) => a.studentId === studentId));
  await prisma.pickupEvent.create({
    data: {
      studentId,
      personName: pass.holder.name,
      pickupPersonId: pickupPerson?.id,
      method: "PASS",
      teacherId: user.id,
    },
  });
  redirect(`/pickup?student=${studentId}&done=1`);
}

export async function deliverWithApproval(approvalId: string) {
  const approval = await prisma.pickupApproval.findUniqueOrThrow({ where: { id: approvalId } });
  const user = await requireStudentAccess(approval.studentId);
  // Re-check: another guardian may have said "No" since the page was rendered.
  if (approval.completedAt || currentApprovalStatus(approval, new Date()) !== "APPROVED") {
    redirect(`/pickup?student=${approval.studentId}&error=1`);
  }
  await prisma.$transaction([
    prisma.pickupApproval.update({ where: { id: approvalId }, data: { completedAt: new Date() } }),
    prisma.pickupEvent.create({
      data: { studentId: approval.studentId, personName: approval.personName, method: "LIVE_APPROVAL", teacherId: user.id },
    }),
  ]);
  redirect(`/pickup?student=${approval.studentId}&done=1`);
}

export async function askGuardians(studentId: string, formData: FormData) {
  const user = await requireStudentAccess(studentId);
  const personName = z.string().trim().min(2).max(80).safeParse(formData.get("personName"));
  if (personName.success) {
    await prisma.pickupApproval.create({ data: { studentId, personName: personName.data, teacherId: user.id } });
  }
  redirect(`/pickup?student=${studentId}`);
}

/** A guardian answers a live pickup request for one of their children. */
export async function answerApproval(approvalId: string, answer: "yes" | "no") {
  const { user, guardian } = await requireGuardian("pickup:approve");
  const approval = await prisma.pickupApproval.findUniqueOrThrow({ where: { id: approvalId } });
  if (!(await canAccessStudent(user, approval.studentId))) throw new Error("Forbidden");

  const now = new Date();
  const status = nextApprovalStatus(approval, answer, now);
  if (status !== approval.status) {
    await prisma.pickupApproval.update({
      where: { id: approvalId },
      data: status === "EXPIRED" ? { status } : { status, respondedByGuardianId: guardian.id, respondedAt: now },
    });
  }
  revalidatePath("/family");
}
