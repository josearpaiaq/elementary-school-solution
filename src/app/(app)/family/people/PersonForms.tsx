"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { addPickupPerson, newPickupInvitation, updatePickupPerson, type PeopleState } from "@/app/actions/people";
import { t } from "@/lib/strings";
import { btnPrimary, btnSecondary, input } from "@/lib/ui";

const MAX_PHOTO_SIDE = 1280;

/** Phone photos are often several MB, so they are resized to a JPEG before upload. */
async function shrinkPhoto(event: React.ChangeEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) return;
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], "photo.jpg", { type: "image/jpeg" }));
    input.files = transfer.files;
  } catch {
    // Formats the browser can't decode are uploaded as-is; the server validates them.
  }
}

function CodeNotice({ state }: { state: PeopleState }) {
  if (!state.code) return null;
  return (
    <div className="rounded-lg border-2 border-green-400 bg-green-50 p-3">
      <p className="text-sm">
        {state.personName}: {t.people.codeCreated}
      </p>
      <p className="mt-1 font-mono text-2xl tracking-widest">{state.code}</p>
    </div>
  );
}

type PersonFormProps = {
  mode: "add" | "edit";
  childOptions: { id: string; name: string }[];
  person?: { id: string; name: string; relationship: string; phone: string; phoneLocked: boolean; studentIds: string[] };
};

export function PersonForm({ mode, childOptions, person }: PersonFormProps) {
  const [state, formAction] = useFormState(mode === "add" ? addPickupPerson : updatePickupPerson, {});
  const formRef = useRef<HTMLFormElement>(null);
  // Clear the add form after a successful submit so the same person isn't added twice.
  useEffect(() => {
    if (mode === "add" && state.code) formRef.current?.reset();
  }, [mode, state]);
  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      {state.error && <p className="text-sm text-red-700">{t.people.invalidData}</p>}
      <CodeNotice state={state} />
      {person && <input type="hidden" name="personId" value={person.id} />}
      <label className="block text-sm">
        {t.people.name}
        <input name="name" defaultValue={person?.name} required minLength={2} maxLength={80} className={input} />
      </label>
      <label className="block text-sm">
        {t.people.relationship}
        <input name="relationship" defaultValue={person?.relationship} required minLength={2} maxLength={40} className={input} />
      </label>
      <label className="block text-sm">
        {t.people.phone}
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          defaultValue={person?.phone}
          required
          readOnly={person?.phoneLocked}
          className={input}
        />
      </label>
      <label className="block text-sm">
        {t.people.photo}
        <input
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={shrinkPhoto}
          className={input}
        />
      </label>
      <fieldset>
        <legend className="text-sm">{t.people.children}</legend>
        {childOptions.map((child) => (
          <label key={child.id} className="mt-1 flex items-center gap-2">
            <input
              type="checkbox"
              name="studentIds"
              value={child.id}
              defaultChecked={person ? person.studentIds.includes(child.id) : childOptions.length === 1}
              className="h-5 w-5"
            />
            {child.name}
          </label>
        ))}
      </fieldset>
      <button className={`${btnPrimary} w-full py-3`}>{mode === "add" ? t.people.add : t.people.save}</button>
    </form>
  );
}

export function InviteButton({ personId }: { personId: string }) {
  const [state, formAction] = useFormState(newPickupInvitation.bind(null, personId), {});
  return (
    <form action={formAction} className="space-y-2">
      <CodeNotice state={state} />
      {!state.code && <button className={`${btnSecondary} w-full`}>{t.people.newCode}</button>}
    </form>
  );
}
