import { notFound } from "next/navigation";
import { closeRequest, markPaper, publishRequest } from "@/app/actions/requests";
import { StatusBadge } from "@/components/StatusBadge";
import { requirePermission } from "@/lib/auth";
import type { RequestStatus, StudentStatus } from "@/lib/permissions";
import { can } from "@/lib/rbac";
import { getRequestReport } from "@/lib/requests";
import { formatDate, t } from "@/lib/strings";
import { btnPrimary, btnSecondary, card } from "@/lib/ui";

const STATUSES: StudentStatus[] = ["AUTHORIZED", "DENIED", "PENDING", "CONFLICT"];

export default async function RequestPage({ params }: { params: { id: string } }) {
  const user = await requirePermission("requests:view");
  const report = await getRequestReport(params.id, user);
  if (!report) notFound();
  const { request, classrooms } = report;
  const canManage = can(user.role, "requests:manage");
  const canRecordPaper = can(user.role, "requests:recordPaper") && request.status === "OPEN";
  const paperButton = "rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-100";

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-gray-500">{t.requestStatus[request.status as RequestStatus]}</p>
        <h1 className="text-2xl font-semibold">{request.title}</h1>
        {request.description && <p className="text-gray-700">{request.description}</p>}
        <p className="text-sm text-gray-600">
          {t.request.event}: {formatDate(request.eventDate)} · {t.dashboard.deadline}: {formatDate(request.deadline)}
        </p>
      </header>

      {canManage && (
        <div className="flex flex-wrap gap-2">
          {request.status === "DRAFT" && (
            <form action={publishRequest.bind(null, request.id)}>
              <button className={btnPrimary}>{t.request.publish}</button>
            </form>
          )}
          {request.status === "OPEN" && (
            <form action={closeRequest.bind(null, request.id)}>
              <button className={btnSecondary}>{t.request.close}</button>
            </form>
          )}
        </div>
      )}

      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-1 pr-3">{t.request.classroom}</th>
              {STATUSES.map((s) => (
                <th key={s} className="py-1 pr-3">
                  {t.status[s]}
                </th>
              ))}
              <th className="py-1">{t.request.total}</th>
            </tr>
          </thead>
          <tbody>
            {classrooms.map((c) => (
              <tr key={c.id} className="border-t border-gray-100">
                <td className="py-1 pr-3 font-medium">{c.name}</td>
                {STATUSES.map((s) => (
                  <td key={s} className="py-1 pr-3">
                    {c.counts[s]}
                  </td>
                ))}
                <td className="py-1">{c.students.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {classrooms.map((c) => (
        <section key={c.id} className="space-y-2">
          <h2 className="text-lg font-semibold">{c.name}</h2>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {c.students.map((s) => (
              <li key={s.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.name}</span>
                    <StatusBadge status={s.status} />
                  </div>
                  {s.responses.map((r) => (
                    <p key={r.id} className="text-xs text-gray-600">
                      {r.guardian.name}: {t.status[r.decision as StudentStatus]}
                      {r.channel === "PAPER" && ` (${t.request.paper})`}
                    </p>
                  ))}
                  {s.status === "PENDING" &&
                    s.guardians.map(({ guardian }) => (
                      <p key={guardian.id} className="text-xs text-gray-600">
                        {guardian.name} · <a href={`tel:${guardian.phone}`}>{guardian.phone}</a>
                        {!guardian.userId && <span className="text-red-700"> · {t.request.noAccount}</span>}
                      </p>
                    ))}
                </div>
                {canRecordPaper && s.status !== "AUTHORIZED" && s.guardians.length > 0 && (
                  <div className="flex gap-2">
                    <form action={markPaper.bind(null, request.id, s.id, "AUTHORIZED")}>
                      <button className={paperButton}>{t.request.paperYes}</button>
                    </form>
                    <form action={markPaper.bind(null, request.id, s.id, "DENIED")}>
                      <button className={paperButton}>{t.request.paperNo}</button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
