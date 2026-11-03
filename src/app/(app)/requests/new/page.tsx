import { createRequest } from "@/app/actions/requests";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { t } from "@/lib/strings";
import { btnPrimary, card, input } from "@/lib/ui";

export default async function NewRequestPage({ searchParams }: { searchParams: { error?: string } }) {
  await requirePermission("requests:manage");
  const classrooms = await prisma.classroom.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">{t.request.newTitle}</h1>
      {searchParams.error && <p className="text-sm text-red-700">{t.request.invalid}</p>}
      <form action={createRequest} className={`${card} space-y-4`}>
        <label className="block text-sm">
          {t.request.title}
          <input name="title" required maxLength={120} className={input} />
        </label>
        <label className="block text-sm">
          {t.request.description}
          <textarea name="description" rows={3} maxLength={500} className={input} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            {t.request.eventDate}
            <input name="eventDate" type="datetime-local" required className={input} />
          </label>
          <label className="block text-sm">
            {t.request.deadline}
            <input name="deadline" type="datetime-local" required className={input} />
          </label>
        </div>
        <fieldset>
          <legend className="text-sm">{t.request.classrooms}</legend>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {classrooms.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="classroomIds" value={c.id} className="h-4 w-4" />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
        <button className={btnPrimary}>{t.request.create}</button>
      </form>
    </div>
  );
}
