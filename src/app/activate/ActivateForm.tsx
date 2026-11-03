"use client";

import { useFormState } from "react-dom";
import { activate } from "@/app/actions/auth";
import { t } from "@/lib/strings";
import { btnPrimary, input } from "@/lib/ui";

export function ActivateForm({ code }: { code: string }) {
  const [state, formAction] = useFormState(activate, {});
  return (
    <form action={formAction} className="space-y-4 rounded-lg bg-white p-6 shadow-sm">
      {state.error && <p className="text-sm text-red-700">{t.activate.errors[state.error]}</p>}
      <label className="block text-sm">
        {t.activate.code}
        <input name="code" defaultValue={code} required autoCapitalize="characters" className={`${input} uppercase tracking-widest`} />
      </label>
      <label className="block text-sm">
        {t.activate.phone}
        <input name="phone" type="tel" inputMode="tel" required autoComplete="tel" className={input} />
      </label>
      <label className="block text-sm">
        {t.activate.password}
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={input} />
      </label>
      <button className={`${btnPrimary} w-full py-3 text-base`}>{t.activate.submit}</button>
    </form>
  );
}
