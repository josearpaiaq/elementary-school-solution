import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { homeFor } from "@/lib/rbac";
import { t } from "@/lib/strings";
import { btnPrimary, btnSecondary } from "@/lib/ui";

/** Public landing for coordinators evaluating the tool; signed-in users go to their home. */
export default async function Home() {
  const user = await getUser();
  if (user) redirect(homeFor(user.role));
  const l = t.landing;

  return (
    <main className="bg-white">
      <section className="bg-gradient-to-b from-blue-50 to-white">
        <div className="mx-auto max-w-5xl px-4 pb-16 pt-12 sm:pt-20">
          <p className="text-sm font-medium uppercase tracking-wide text-blue-700">{l.eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight text-gray-900 sm:text-5xl">{l.title}</h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-700">{l.subtitle}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className={`${btnPrimary} px-6 py-3 text-base`}>
              {l.login}
            </Link>
            <Link href="/activate" className={`${btnSecondary} px-6 py-3 text-base`}>
              {l.activate}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-2xl font-semibold">{l.problemTitle}</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {l.problems.map((problem) => (
            <li key={problem} className="rounded-lg border border-red-100 bg-red-50 p-4 text-gray-800">
              {problem}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-2xl font-semibold">{l.featuresTitle}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {l.features.map((feature) => (
            <div key={feature.title} className="rounded-lg border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-2 text-gray-700">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold">{l.stepsTitle}</h2>
            <ol className="mt-4 space-y-3">
              {l.steps.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-gray-800">{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="text-2xl font-semibold">{l.rolesTitle}</h2>
            <dl className="mt-4 space-y-3">
              {l.roles.map((role) => (
                <div key={role.name}>
                  <dt className="font-medium text-gray-900">{role.name}</dt>
                  <dd className="text-gray-700">{role.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-4 py-10 text-sm text-gray-600">{l.footer}</footer>
    </main>
  );
}
