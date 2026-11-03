"use server";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createInvitation } from "@/lib/invitations";
import { classroomScope } from "@/lib/rbac";

export type Slip = { guardianName: string; phone: string; students: string[]; code: string };
export type InvitationsState = { classroomName?: string; slips?: Slip[] };

/** Generates fresh codes for every guardian without an account in a classroom the user manages. */
export async function generateClassroomInvitations(_: InvitationsState, formData: FormData): Promise<InvitationsState> {
  const user = await requirePermission("invitations:guardians");
  const classroom = await prisma.classroom.findFirstOrThrow({
    where: { AND: [{ id: String(formData.get("classroomId")) }, classroomScope(user)] },
  });
  const guardians = await prisma.guardian.findMany({
    where: { userId: null, students: { some: { student: { classroomId: classroom.id } } } },
    include: { students: { where: { student: { classroomId: classroom.id } }, include: { student: true } } },
    orderBy: { name: "asc" },
  });

  const slips: Slip[] = [];
  for (const guardian of guardians) {
    slips.push({
      guardianName: guardian.name,
      phone: guardian.phone,
      students: guardian.students.map((s) => s.student.name),
      code: await createInvitation({ guardianId: guardian.id }, user.id),
    });
  }
  return { classroomName: classroom.name, slips };
}
