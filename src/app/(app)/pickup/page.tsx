import Link from "next/link";
import { askGuardians, deliverManual, deliverWithApproval, deliverWithPass } from "@/app/actions/pickup";
import { AutoRefresh } from "@/components/AutoRefresh";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolvePass } from "@/lib/pass";
import { latestOpenApproval, type ApprovalStatus } from "@/lib/pickup";
import { studentScope } from "@/lib/rbac";
import { formatDate, t } from "@/lib/strings";
import { btnPrimary, btnSuccess, card, input } from "@/lib/ui";

const APPROVAL_STYLES: Record<ApprovalStatus, string> = {
  PENDING: "border-yellow-300 bg-yellow-50",
  APPROVED: "border-green-400 bg-green-50",
  REJECTED: "border-red-400 bg-red-50",
  EXPIRED: "border-red-400 bg-red-50",
};

type SearchParams = { pass?: string; q?: string; student?: string; done?: string; error?: string };

function Photo({ personId, name, size = "h-24 w-24" }: { personId?: string; name: string; size?: string }) {
  if (!personId) return <div className={`${size} shrink-0 rounded-lg bg-gray-200`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/api/photos/${personId}`} alt={name} className={`${size} shrink-0 rounded-lg object-cover`} />;
}

export default async function PickupPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("pickup:deliver");
  const scope = studentScope(user);
  const q = searchParams.q?.trim() ?? "";
  const passCredential = searchParams.pass?.trim() ?? "";

  const pass = passCredential ? await resolvePass(passCredential, user) : null;
  const results = q
    ? await prisma.student.findMany({
        where: { AND: [scope, { name: { contains: q } }] },
        include: { classroom: true },
        orderBy: { name: "asc" },
        take: 20,
      })
    : [];
  const student = searchParams.student
    ? await prisma.student.findFirst({
        where: { AND: [scope, { id: searchParams.student }] },
        include: {
          classroom: true,
          guardians: { include: { guardian: true } },
          pickupAuthorizations: { include: { pickupPerson: true }, orderBy: { pickupPerson: { name: "asc" } } },
          pickupEvents: { orderBy: { createdAt: "desc" }, take: 5 },
        },
      })
    : null;
  const approval = student ? await latestOpenApproval(student.id) : null;
  const passPhoto = pass?.pickupPeople.find((p) => p.photoKey);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-2xl font-semibold">{t.pickup.title}</h1>

      <section className={`${card} space-y-3`}>
        <h2 className="font-medium">{t.pickup.passTitle}</h2>
        <form className="flex gap-2">
          <input
            name="pass"
            defaultValue={/^\d{6}$/.test(passCredential) ? passCredential : ""}
            placeholder={t.pickup.passPlaceholder}
            inputMode="numeric"
            pattern="\d{6}"
            className={`${input} font-mono tracking-widest`}
          />
          <button className={`${btnPrimary} mt-1`}>{t.pickup.validate}</button>
        </form>
        {passCredential && !pass && (
          <p className="rounded bg-red-100 px-3 py-2 text-red-800">{t.pickup.passInvalid}</p>
        )}
        {pass && (
          <div className="space-y-3 rounded-lg border-2 border-green-400 bg-green-50 p-4">
            <div className="flex items-center gap-3">
              <Photo personId={passPhoto?.id} name={pass.holder.name} />
              <div>
                <p className="text-sm text-green-800">{t.pickup.passHolder}</p>
                <p className="text-lg font-semibold">{pass.holder.name}</p>
                <p className="text-sm text-gray-600">
                  {pass.holder.role === "GUARDIAN" ? t.roles.GUARDIAN : pass.pickupPeople[0]?.relationship}
                </p>
              </div>
            </div>
            <ul className="space-y-2">
              {pass.students.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2">
                  <span>
                    {s.name} <span className="text-sm text-gray-500">· {s.classroom.name}</span>
                  </span>
                  <form action={deliverWithPass.bind(null, passCredential, s.id)}>
                    <button className={btnSuccess}>{t.pickup.deliver}</button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className={`${card} space-y-3`}>
        <h2 className="font-medium">{t.pickup.searchTitle}</h2>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder={t.pickup.searchPlaceholder} className={input} />
          <button className={`${btnPrimary} mt-1`}>{t.pickup.search}</button>
        </form>
        {q && (
          <ul className="divide-y divide-gray-100">
            {results.length === 0 && <li className="py-2 text-gray-500">{t.pickup.noResults}</li>}
            {results.map((s) => (
              <li key={s.id}>
                <Link href={`/pickup?student=${s.id}`} className="block py-2 hover:bg-gray-50">
                  {s.name} <span className="text-sm text-gray-500">· {s.classroom.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {student && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">
            {student.name} <span className="text-base font-normal text-gray-500">· {student.classroom.name}</span>
          </h2>
          {searchParams.done && <p className="rounded bg-green-100 px-3 py-2 text-green-800">{t.pickup.delivered}</p>}
          {searchParams.error && <p className="rounded bg-red-100 px-3 py-2 text-red-800">{t.pickup.cannotDeliver}</p>}

          {approval && (
            <div className={`space-y-2 rounded-lg border-2 p-4 ${APPROVAL_STYLES[approval.status]}`}>
              {approval.status === "PENDING" && <AutoRefresh />}
              <p className="font-medium">{approval.personName}</p>
              <p>{t.approvalStatus[approval.status]}</p>
              {approval.status !== "APPROVED" && (
                <ul className="text-sm">
                  {student.guardians.map(({ guardian }) => (
                    <li key={guardian.id}>
                      {guardian.name} ·{" "}
                      <a href={`tel:${guardian.phone}`} className="text-blue-700 underline">
                        {guardian.phone}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {approval.status === "APPROVED" && (
                <form action={deliverWithApproval.bind(null, approval.id)}>
                  <button className={`${btnSuccess} w-full py-3 text-base`}>{t.pickup.deliverTo(approval.personName)}</button>
                </form>
              )}
            </div>
          )}

          <div className={card}>
            <h3 className="mb-2 font-medium">{t.pickup.guardians}</h3>
            <ul className="space-y-2">
              {student.guardians.map(({ guardian }) => (
                <li key={guardian.id} className="flex items-center justify-between gap-2">
                  <span>
                    {guardian.name} <span className="text-sm text-gray-500">{guardian.phone}</span>
                  </span>
                  <form action={deliverManual.bind(null, student.id, guardian.name, null)}>
                    <button className={btnSuccess}>{t.pickup.deliver}</button>
                  </form>
                </li>
              ))}
            </ul>
          </div>

          <div className={card}>
            <h3 className="mb-2 font-medium">{t.pickup.authorized}</h3>
            {student.pickupAuthorizations.length === 0 && (
              <p className="text-sm text-gray-500">{t.pickup.noneAuthorized}</p>
            )}
            <ul className="space-y-3">
              {student.pickupAuthorizations.map(({ pickupPerson: person }) => (
                <li key={person.id} className="flex items-center gap-3">
                  <Photo personId={person.photoKey ? person.id : undefined} name={person.name} />
                  <div className="flex-1">
                    <p className="font-medium">{person.name}</p>
                    <p className="text-sm text-gray-600">{person.relationship}</p>
                  </div>
                  <form action={deliverManual.bind(null, student.id, person.name, person.id)}>
                    <button className={btnSuccess}>{t.pickup.deliver}</button>
                  </form>
                </li>
              ))}
            </ul>
          </div>

          <form action={askGuardians.bind(null, student.id)} className={`${card} space-y-2`}>
            <h3 className="font-medium">{t.pickup.unregistered}</h3>
            <input name="personName" required minLength={2} placeholder={t.pickup.personName} className={input} />
            <button className={`${btnPrimary} w-full`}>{t.pickup.requestApproval}</button>
            <p className="text-xs text-gray-500">{t.pickup.approvalHint}</p>
          </form>

          {student.pickupEvents.length > 0 && (
            <div className={card}>
              <h3 className="mb-2 font-medium">{t.pickup.history}</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                {student.pickupEvents.map((e) => (
                  <li key={e.id}>
                    {formatDate(e.createdAt)} · {e.personName} ({t.pickup.methods[e.method as keyof typeof t.pickup.methods]})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
