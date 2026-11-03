"use client";

import { useFormState } from "react-dom";
import { generateClassroomInvitations } from "@/app/actions/invitations";
import { t } from "@/lib/strings";
import { btnPrimary, btnSecondary, input } from "@/lib/ui";

type Props = { classrooms: { id: string; label: string }[]; baseUrl: string };

export function InvitationsForm({ classrooms, baseUrl }: Props) {
  const [state, formAction] = useFormState(generateClassroomInvitations, {});
  return (
    <>
      <form action={formAction} className="flex max-w-md items-end gap-2 print:hidden">
        <label className="block flex-1 text-sm">
          {t.invitations.classroom}
          <select name="classroomId" className={input}>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <button className={btnPrimary}>{t.invitations.generate}</button>
      </form>

      {state.slips && (
        <section className="space-y-3">
          <div className="flex items-center justify-between print:hidden">
            <h2 className="text-lg font-semibold">{state.classroomName}</h2>
            {state.slips.length > 0 && (
              <button onClick={() => window.print()} className={btnSecondary}>
                {t.invitations.print}
              </button>
            )}
          </div>
          {state.slips.length === 0 && <p className="text-gray-500">{t.invitations.none}</p>}
          <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
            {state.slips.map((slip) => (
              <div key={slip.code} className="break-inside-avoid rounded-lg border-2 border-dashed border-gray-400 bg-white p-4">
                <p className="font-medium">{slip.guardianName}</p>
                <p className="text-sm text-gray-600">
                  {state.classroomName} · {slip.students.join(", ")}
                </p>
                <p className="my-2 font-mono text-2xl tracking-widest">{slip.code}</p>
                <p className="text-xs text-gray-700">{t.invitations.slip(baseUrl)}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
