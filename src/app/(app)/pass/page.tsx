import QRCode from "qrcode";
import { AutoRefresh } from "@/components/AutoRefresh";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { passCode, passToken } from "@/lib/pass";
import { studentScope } from "@/lib/rbac";
import { t } from "@/lib/strings";
import { card } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function PassPage() {
  const user = await requirePermission("pass:show");
  const students = await prisma.student.findMany({
    where: studentScope(user),
    include: { classroom: true },
    orderBy: { name: "asc" },
  });
  const photoPerson = await prisma.pickupPerson.findFirst({ where: { userId: user.id, photoKey: { not: null } } });

  const url = `${process.env.BASE_URL ?? "http://localhost:3000"}/pickup?pass=${passToken(user.id)}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, width: 240 });

  return (
    <div className="mx-auto max-w-sm space-y-4 text-center">
      {/* Refresh before the 5-minute window rolls over. */}
      <AutoRefresh intervalMs={30000} />
      <h1 className="text-2xl font-semibold">{t.pass.title}</h1>
      {students.length === 0 ? (
        <p className="text-gray-600">{t.pass.none}</p>
      ) : (
        <>
          <p className="text-gray-700">{t.pass.intro}</p>
          <div className={`${card} space-y-3`}>
            {photoPerson && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/photos/${photoPerson.id}`} alt={user.name} className="mx-auto h-24 w-24 rounded-full object-cover" />
            )}
            <p className="text-lg font-semibold">{user.name}</p>
            <div className="mx-auto w-60" dangerouslySetInnerHTML={{ __html: qr }} />
            <p className="font-mono text-4xl tracking-[0.3em]">{passCode(user.id)}</p>
            <p className="text-xs text-gray-500">{t.pass.refresh}</p>
          </div>
          <div className={`${card} text-left`}>
            <h2 className="mb-1 font-medium">{t.pass.students}</h2>
            <ul className="text-gray-700">
              {students.map((s) => (
                <li key={s.id}>
                  {s.name} · {s.classroom.name}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
