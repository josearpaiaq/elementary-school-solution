import Link from "next/link";
import { login } from "@/app/actions/auth";
import { t } from "@/lib/strings";
import { btnPrimary, input } from "@/lib/ui";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold">{t.appName}</h1>
      <form action={login} className="space-y-4 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium">{t.login.title}</h2>
        {searchParams.error && <p className="text-sm text-red-700">{t.login.error}</p>}
        <label className="block text-sm">
          {t.login.login}
          <input name="login" required autoComplete="username" className={input} />
        </label>
        <label className="block text-sm">
          {t.login.password}
          <input name="password" type="password" required autoComplete="current-password" className={input} />
        </label>
        <button className={`${btnPrimary} w-full`}>{t.login.submit}</button>
      </form>
      <p className="mt-4 text-sm">
        {t.login.activatePrompt}{" "}
        <Link href="/activate" className="text-blue-700 underline">
          {t.login.activateLink}
        </Link>
      </p>
      {process.env.NODE_ENV !== "production" && <p className="mt-2 text-xs text-gray-500">{t.login.demoHint}</p>}
    </main>
  );
}
