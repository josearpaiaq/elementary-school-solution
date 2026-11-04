import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { studentStatus, type StudentStatus } from "@/lib/permissions";
import { classroomScope } from "@/lib/rbac";
import { answeredAfter } from "@/lib/reminders";

const EMPTY_COUNTS: Record<StudentStatus, number> = { AUTHORIZED: 0, DENIED: 0, PENDING: 0, CONFLICT: 0 };

/** Request status per classroom, limited to the classrooms the user can see. */
export async function getRequestReport(requestId: string, user: User) {
  const request = await prisma.permissionRequest.findUnique({
    where: { id: requestId },
    include: {
      groupReminders: { orderBy: { createdAt: "desc" }, include: { sentBy: { select: { name: true } } } },
      classrooms: {
        where: { classroom: classroomScope(user) },
        include: {
          classroom: {
            include: {
              students: {
                orderBy: { name: "asc" },
                include: {
                  guardians: { include: { guardian: true } },
                  responses: { where: { requestId }, include: { guardian: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!request || request.classrooms.length === 0) return null;

  const classrooms = request.classrooms
    .map((rc) => rc.classroom)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((classroom) => {
      const students = classroom.students.map((s) => ({
        ...s,
        status: studentStatus(s.responses.map((r) => r.decision)),
      }));
      const counts = { ...EMPTY_COUNTS };
      for (const s of students) counts[s.status]++;
      const reminder = request.groupReminders.find((r) => r.classroomId === classroom.id);
      const lastReminder = reminder && {
        ...reminder,
        answeredAfter: answeredAfter(reminder.createdAt, students.flatMap((s) => s.responses)),
      };
      return { ...classroom, students, counts, lastReminder };
    });

  return { request, classrooms };
}
