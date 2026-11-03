import Link from "next/link";
import type { User } from "@prisma/client";
import { logout } from "@/app/actions/auth";
import { can, homeFor } from "@/lib/rbac";
import { t } from "@/lib/strings";

/** Top navigation; each link is shown only to roles allowed to use it. */
export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const links = [
    { href: "/dashboard", label: t.nav.requests, show: can(user.role, "requests:view") },
    { href: "/pickup", label: t.nav.pickup, show: can(user.role, "pickup:deliver") },
    { href: "/invitations", label: t.nav.invitations, show: can(user.role, "invitations:guardians") },
    { href: "/import", label: t.nav.import, show: can(user.role, "students:import") },
    { href: "/family", label: t.nav.family, show: can(user.role, "requests:answer") },
    { href: "/family/people", label: t.nav.people, show: can(user.role, "pickupPeople:manage") },
    { href: "/pass", label: t.nav.pass, show: can(user.role, "pass:show") },
  ].filter((link) => link.show);

  return (
    <div>
      <header className="border-b border-gray-200 bg-white print:hidden">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-sm">
          <Link href={homeFor(user.role)} className="font-semibold">
            {t.appName}
          </Link>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:underline">
              {link.label}
            </Link>
          ))}
          <span className="ml-auto text-gray-500">
            {user.name} · {t.roles[user.role as keyof typeof t.roles]}
          </span>
          <form action={logout}>
            <button className="text-gray-600 hover:underline">{t.nav.logout}</button>
          </form>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
