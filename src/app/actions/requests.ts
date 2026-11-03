"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canAccessStudent, requireGuardian, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canRespond } from "@/lib/permissions";

const requestSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().max(500),
    eventDate: z.coerce.date(),
    deadline: z.coerce.date(),
    classroomIds: z.array(z.string().min(1)).min(1),
  })
  .refine((data) => data.deadline <= data.eventDate);

export async function createRequest(formData: FormData) {
  await requirePermission("requests:manage");
  const parsed = requestSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    eventDate: formData.get("eventDate"),
    deadline: formData.get("deadline"),
    classroomIds: formData.getAll("classroomIds"),
  });
  if (!parsed.success) redirect("/requests/new?error=1");

  const { classroomIds, ...data } = parsed.data;
  const request = await prisma.permissionRequest.create({
    data: { ...data, classrooms: { create: classroomIds.map((classroomId) => ({ classroomId })) } },
  });
  redirect(`/requests/${request.id}`);
}

export async function publishRequest(requestId: string) {
  await requirePermission("requests:manage");
  await prisma.permissionRequest.updateMany({
    where: { id: requestId, status: "DRAFT" },
    data: { status: "OPEN", publishedAt: new Date() },
  });
  revalidatePath(`/requests/${requestId}`);
}

export async function closeRequest(requestId: string) {
  await requirePermission("requests:manage");
  await prisma.permissionRequest.update({ where: { id: requestId }, data: { status: "CLOSED" } });
  revalidatePath(`/requests/${requestId}`);
}

/** Records a paper slip. It is stored under the student's first guardian with channel PAPER. */
export async function markPaper(requestId: string, studentId: string, decision: "AUTHORIZED" | "DENIED") {
  const user = await requirePermission("requests:recordPaper");
  if (!(await canAccessStudent(user, studentId))) throw new Error("Forbidden");
  const link = await prisma.studentGuardian.findFirst({ where: { studentId } });
  if (!link) return;
  const guardianId = link.guardianId;
  await prisma.permissionResponse.upsert({
    where: { requestId_studentId_guardianId: { requestId, studentId, guardianId } },
    create: { requestId, studentId, guardianId, decision, channel: "PAPER" },
    update: { decision, channel: "PAPER", respondedAt: new Date() },
  });
  revalidatePath(`/requests/${requestId}`);
}

/** A guardian answers for one of their children; the request must target the child's classroom. */
export async function answerRequest(requestId: string, studentId: string, decision: "AUTHORIZED" | "DENIED") {
  const { user, guardian } = await requireGuardian("requests:answer");
  if (!(await canAccessStudent(user, studentId))) throw new Error("Forbidden");
  const request = await prisma.permissionRequest.findFirst({
    where: { id: requestId, classrooms: { some: { classroom: { students: { some: { id: studentId } } } } } },
  });
  if (!request || !canRespond(request, new Date())) throw new Error("Request is not open");

  await prisma.permissionResponse.upsert({
    where: { requestId_studentId_guardianId: { requestId, studentId, guardianId: guardian.id } },
    create: { requestId, studentId, guardianId: guardian.id, decision },
    update: { decision, channel: "WEB", respondedAt: new Date() },
  });
  revalidatePath("/family");
}
