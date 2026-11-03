import { removePickupPerson } from "@/app/actions/people";
import { requireGuardian } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { t } from "@/lib/strings";
import { btnSecondary, card } from "@/lib/ui";
import { InviteButton, PersonForm } from "./PersonForms";

export default async function PeoplePage() {
  const { guardian } = await requireGuardian("pickupPeople:manage");
  const children = await prisma.student.findMany({
    where: { guardians: { some: { guardianId: guardian.id } } },
    orderBy: { name: "asc" },
  });
  const childIds = children.map((c) => c.id);
  const people = await prisma.pickupPerson.findMany({
    where: { authorizations: { some: { studentId: { in: childIds } } } },
    include: { authorizations: { where: { studentId: { in: childIds } } } },
    orderBy: { name: "asc" },
  });
  const childOptions = children.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{t.people.title}</h1>
        <p className="text-gray-700">{t.people.intro}</p>
      </header>

      {people.length === 0 && <p className="text-gray-500">{t.people.none}</p>}
      {people.map((person) => {
        const authorized = person.authorizations.map((a) => a.studentId);
        return (
          <div key={person.id} className={`${card} space-y-3`}>
            <div className="flex items-center gap-3">
              {person.photoKey ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/photos/${person.id}`} alt={person.name} className="h-20 w-20 rounded-lg object-cover" />
              ) : (
                <div className="h-20 w-20 rounded-lg bg-gray-200" />
              )}
              <div className="flex-1">
                <p className="font-medium">{person.name}</p>
                <p className="text-sm text-gray-600">
                  {person.relationship} · {children.filter((c) => authorized.includes(c.id)).map((c) => c.name).join(", ")}
                </p>
                <p className={`text-xs ${person.userId ? "text-green-700" : "text-yellow-700"}`}>
                  {person.userId ? t.people.hasAccount : t.people.noAccount}
                </p>
              </div>
            </div>
            {!person.userId && <InviteButton personId={person.id} />}
            <details>
              <summary className="cursor-pointer text-sm text-blue-700">{t.people.edit}</summary>
              <div className="mt-3 space-y-2">
                <PersonForm
                  mode="edit"
                  childOptions={childOptions}
                  person={{
                    id: person.id,
                    name: person.name,
                    relationship: person.relationship,
                    phone: person.phone ?? "",
                    phoneLocked: Boolean(person.userId),
                    studentIds: authorized,
                  }}
                />
                <form action={removePickupPerson.bind(null, person.id)}>
                  <button className={`${btnSecondary} w-full py-3 text-red-700`}>{t.people.remove}</button>
                </form>
              </div>
            </details>
          </div>
        );
      })}

      <details className={card} open={people.length === 0}>
        <summary className="cursor-pointer font-medium text-blue-700">+ {t.people.add}</summary>
        <div className="mt-3">
          <PersonForm mode="add" childOptions={childOptions} />
        </div>
      </details>

      <p className="text-xs text-gray-500">{t.people.privacy}</p>
    </div>
  );
}
