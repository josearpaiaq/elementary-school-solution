import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { RequestStatus } from "@/lib/permissions";
import { can, classroomScope } from "@/lib/rbac";
import { formatDate, t } from "@/lib/strings";
import { btnPrimary, card } from "@/lib/ui";

export default async function DashboardPage() {
  const user = await requirePermission("requests:view");
  const canManage = can(user.role, "requests:manage");
  const scope = classroomScope(user);
  const requests = await prisma.permissionRequest.findMany({
    where: { classrooms: { some: { classroom: scope } } },
    include: { classrooms: { where: { classroom: scope }, include: { classroom: true } } },
    orderBy: { createdAt: "desc" },
  });
  const guardianScope = { students: { some: { student: { classroom: scope } } } };
  const [totalGuardians, activeGuardians] = await Promise.all([
    prisma.guardian.count({ where: guardianScope }),
    prisma.guardian.count({ where: { ...guardianScope, userId: { not: null } } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t.dashboard.title}</h1>
        {canManage && (
          <Link href="/requests/new" className={btnPrimary}>
            {t.dashboard.newRequest}
          </Link>
        )}
      </div>

      <section className={`${card} flex flex-wrap items-center justify-between gap-3`}>
        <p>
          {t.dashboard.accounts}: <strong>{activeGuardians}</strong> / {totalGuardians}
        </p>
        <Link href="/invitations" className="text-sm text-blue-700 underline">
          {t.nav.invitations}
        </Link>
      </section>

      {requests.length === 0 ? (
        <p className="text-gray-500">{t.dashboard.empty}</p>
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => (
            <li key={r.id}>
              <Link href={`/requests/${r.id}`} className={`${card} block hover:border-blue-400`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{r.title}</span>
                  <span className="text-sm text-gray-500">{t.requestStatus[r.status as RequestStatus]}</span>
                </div>
                <p className="text-sm text-gray-600">
                  {r.classrooms.map((c) => c.classroom.name).sort().join(", ")} · {t.dashboard.deadline}:{" "}
                  {formatDate(r.deadline)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
