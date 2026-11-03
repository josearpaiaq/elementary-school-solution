# School permissions & pickup — MVP

100% web app for an elementary school to collect permission slips and control who picks up each student. Parents don't install anything: it works in the phone's browser.

Stack: Next.js 14 (App Router) · TypeScript · Tailwind · Prisma + SQLite · Vitest.

## Roles (RBAC)

| Role | Logs in with | Can |
|---|---|---|
| **ADMIN** (coordination) | email | Everything: create/publish/close requests, import students, invitations, pickup |
| **TEACHER** | email | Only **their classrooms**: request reports, record paper slips, guardian invitations, pickup screen |
| **GUARDIAN** | phone | Only **their children**: sign requests, manage pickup people, answer live pickup requests, show their pass |
| **PICKUP** (grandma, nanny…) | phone | Only their **pickup pass** and the children they're authorized for |

RBAC lives in one place, `src/lib/rbac.ts`:

- **`can(role, permission)`**: what each role may do (permission matrix).
- **`studentScope(user)`**: which students each user may see. Every student query in pages, actions and the photo route goes through this filter, so a teacher from another classroom gets a 404 instead of the data.

## Run locally

Requirements: Node 20+. No Docker, no external services.

```bash
cp .env.example .env
npm install
npm run setup      # creates prisma/dev.db, applies migrations, seeds demo data and prints demo accounts
npm run dev        # http://localhost:3000
```

`npm run setup` wipes and reseeds the database; rerun it to start the demo over. It prints the demo accounts and an invitation code. Fixed ones:

| Role | Login | Password |
|---|---|---|
| Admin | `admin@escuela.test` | `admin123` |
| Teacher 3°A | `maestra5@escuela.test` | `maestra123` |
| Guardians | their phone (see seed output) | `tutor123` |
| Pickup people | their phone (see seed output) | `autorizado123` |

Teachers `maestra1` … `maestra12` own 1°A, 1°B, 2°A … 6°B in that order.

**Tip:** to be two users at once (e.g. teacher and guardian), open one at `http://localhost:3000` and the other at `http://127.0.0.1:3000`. Cookies are per host, so the sessions don't mix.

## Demo walkthrough

1. **Activate a guardian.** Go to `/activate` and enter the invitation code and phone printed by the seed, plus a password. You land on the guardian's dashboard.
2. **Sign a permission.** On the dashboard, the "Visita al Museo" request shows **Autorizo / No autorizo**. As admin or the 3°A teacher, the request report updates (authorized / denied / pending / conflict per classroom).
3. **Add a pickup person.** As the guardian, go to **Personas autorizadas** → add name, relationship, phone, optional photo, and which children. A one-time code is shown; the person activates at `/activate` with that code and their phone.
4. **Pickup pass.** As the pickup person (or a guardian), open **Mi pase**: a QR and a 6-digit code that changes every 5 minutes.
5. **Hand-over.** As the 3°A teacher, go to **Recogida** → **Validar pase** with the 6-digit code (or scan the QR with the phone camera, which opens the same page) → **Entregar**. A teacher from another classroom gets "pase no válido".
6. **Unregistered person.** On the student's card → "Llegó una persona no registrada" → **Pedir autorización al tutor**. It shows up on the guardian's dashboard (refreshes every 10 s). The teacher screen updates every 3 s. Any "No" wins, it expires after 15 min, and the guardian's phone is shown for a call.
7. **Invitations.** As admin or teacher, **Invitaciones** → choose a classroom → printable slips with codes for guardians without an account.

### Checks

```bash
npm test           # Vitest (uses a separate prisma/test.db)
npm run lint
npm run typecheck
```

## Security model

- **Accounts by invitation only.** Codes are 8 random characters, single-use, expire in 14 days, and are stored hashed (shown only once). Redeeming also requires the phone the school or guardian registered, so a leaked code alone isn't enough.
- **Pickup pass.** The 6-digit code is an HMAC of the user and the current 5-minute window. The QR carries a signed token with the same lifetime. The teacher only gets a match for holders linked to **their** students, and delivery re-verifies the pass on the server.
- **Sessions.** HMAC-signed httpOnly cookie, 12 h.
- **Photos.** Served only through `/api/photos/[id]` to users whose scope includes the student (or the person themself).

## Deployment

- **Vercel + managed Postgres** (Neon, Supabase…): change `provider = "sqlite"` to `"postgresql"` in `prisma/schema.prisma`, regenerate the migration, and set `DATABASE_URL`, `TOKEN_SECRET` and `BASE_URL`.
- Photos are written to `./storage` on local disk. On serverless hosting, replace `src/lib/storage.ts` with an S3/R2 client.

## Project layout

```
prisma/schema.prisma, seed.ts
src/lib/
  rbac.ts          roles, permission matrix, data scopes
  auth.ts          session + requirePermission / requireGuardian
  invitations.ts   one-time codes and account activation
  pass.ts          rotating pickup pass (code + QR) and teacher-side resolution
  permissions.ts   authorization rule (authorized / denied / pending / conflict)
  pickup.ts        live approval rules
  requests.ts      per-classroom request report
  strings.ts       all Spanish UI text
src/app/
  login, activate  public pages
  (app)/           logged-in pages: dashboard, requests, pickup, invitations, import, family, pass
  actions/         server actions, each guarded by a permission
  api/photos       authorized photo access
tests/             Vitest
```

## Assumptions

- **Web only, no notifications.** Guardians must open the site to see requests and live pickup requests. The fallback is the guardian's phone, shown to the teacher. Push/email/SMS can be added later without changing the model.
- A student is **authorized** if at least one guardian says yes and none says no; disagreement shows as **Conflicto**. Guardians can change their answer until the deadline.
- **Paper slips** are recorded under the student's first guardian with channel `PAPER`.
- One role per account. A phone that already belongs to a guardian can't also be a pickup-person account.
- A pickup person invited by two families uses the same account (same phone and password).
- Guardians manage pickup people only for **their own** children; another family's authorizations for the same person are untouched.
- Phones with 10 digits are assumed to be Mexican (`+52`). Dates are shown in `America/Mexico_City`.
- Not included in the MVP: login/activation rate limiting, password reset, and data export/deletion tooling.
