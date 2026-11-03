import { answerRequest } from "@/app/actions/requests";
import { answerApproval } from "@/app/actions/pickup";
import { AutoRefresh } from "@/components/AutoRefresh";
import { requireGuardian } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canRespond, type StudentStatus } from "@/lib/permissions";
import { currentApprovalStatus } from "@/lib/pickup";
import { formatDate, t } from "@/lib/strings";
import { btnDanger, btnSecondary, btnSuccess, card } from "@/lib/ui";

export default async function FamilyPage() {
  const { guardian } = await requireGuardian("requests:answer");
  const now = new Date();
  const children = await prisma.student.findMany({
    where: { guardians: { some: { guardianId: guardian.id } } },
    include: {
      classroom: {
        include: {
          requests: {
            where: { request: { status: { in: ["OPEN", "CLOSED"] } } },
            include: { request: true },
            orderBy: { request: { eventDate: "asc" } },
          },
        },
      },
      responses: { where: { guardianId: guardian.id } },
      pickupApprovals: { where: { status: "PENDING", completedAt: null }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { name: "asc" },
  });
  const approvals = children.flatMap((child) =>
    child.pickupApprovals
      .filter((a) => currentApprovalStatus(a, now) === "PENDING")
      .map((approval) => ({ approval, child })),
  );

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Polls so a live pickup request from the school shows up without reloading. */}
      <AutoRefresh intervalMs={10000} />
      {approvals.map(({ approval, child }) => (
        <section key={approval.id} className="space-y-3 rounded-lg border-2 border-yellow-400 bg-yellow-50 p-4">
          <h2 className="font-semibold">{t.family.approvalTitle}</h2>
          <p>{t.family.approvalBody(approval.personName, child.name)}</p>
          <div className="flex gap-2">
            <form action={answerApproval.bind(null, approval.id, "yes")} className="flex-1">
              <button className={`${btnSuccess} w-full py-3 text-base`}>{t.family.yes}</button>
            </form>
            <form action={answerApproval.bind(null, approval.id, "no")} className="flex-1">
              <button className={`${btnDanger} w-full py-3 text-base`}>{t.family.no}</button>
            </form>
          </div>
        </section>
      ))}

      <h1 className="text-2xl font-semibold">{t.family.title}</h1>
      {children.map((child) => {
        const requests = child.classroom.requests.map((rc) => rc.request).filter((r) => r.status === "OPEN" || child.responses.some((x) => x.requestId === r.id));
        return (
          <section key={child.id} className="space-y-3">
            <h2 className="text-xl font-semibold">
              {child.name} <span className="text-base font-normal text-gray-500">· {child.classroom.name}</span>
            </h2>
            {requests.length === 0 && <p className="text-gray-500">{t.family.noRequests}</p>}
            {requests.map((request) => {
              const response = child.responses.find((r) => r.requestId === request.id);
              const open = canRespond(request, now);
              return (
                <div key={request.id} className={`${card} space-y-2`}>
                  <p className="font-medium">{request.title}</p>
                  {request.description && <p className="text-sm text-gray-700">{request.description}</p>}
                  <p className="text-sm text-gray-600">
                    {t.request.event}: {formatDate(request.eventDate)} · {t.dashboard.deadline}: {formatDate(request.deadline)}
                  </p>
                  {response && (
                    <p className="text-sm">
                      {t.family.yourAnswer}: <strong>{t.status[response.decision as StudentStatus]}</strong>
                      {open && <span className="text-gray-500"> · {t.family.change}</span>}
                    </p>
                  )}
                  {open ? (
                    <div className="flex gap-2">
                      <form action={answerRequest.bind(null, request.id, child.id, "AUTHORIZED")} className="flex-1">
                        <button
                          className={`${response?.decision === "AUTHORIZED" ? btnSuccess : btnSecondary} w-full py-3`}
                        >
                          {t.family.authorize}
                        </button>
                      </form>
                      <form action={answerRequest.bind(null, request.id, child.id, "DENIED")} className="flex-1">
                        <button className={`${response?.decision === "DENIED" ? btnDanger : btnSecondary} w-full py-3`}>
                          {t.family.deny}
                        </button>
                      </form>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">{t.family.closed}</p>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
