import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { classroomScope } from "@/lib/rbac";
import { t } from "@/lib/strings";
import { InvitationsForm } from "./InvitationsForm";

export default async function InvitationsPage() {
  const user = await requirePermission("invitations:guardians");
  const classrooms = await prisma.classroom.findMany({ where: classroomScope(user), orderBy: { name: "asc" } });
  const pending = await Promise.all(
    classrooms.map((c) =>
      prisma.guardian.count({ where: { userId: null, students: { some: { student: { classroomId: c.id } } } } }),
    ),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold print:hidden">{t.invitations.title}</h1>
      <p className="max-w-2xl text-sm text-gray-700 print:hidden">{t.invitations.intro}</p>
      <InvitationsForm
        classrooms={classrooms.map((c, i) => ({ id: c.id, label: `${c.name} · ${t.invitations.pending(pending[i])}` }))}
        baseUrl={process.env.BASE_URL ?? "http://localhost:3000"}
      />
    </div>
  );
}
