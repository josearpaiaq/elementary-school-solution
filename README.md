# School permissions & pickup — MVP

100% web app for an elementary school to collect permission slips and control who picks up each student. Parents don't install anything: it works in the phone's browser.

Stack: Next.js 14 (App Router) · TypeScript · Tailwind · Prisma + Postgres (Neon in production) · Vitest.

Product docs: [ICP and user persona](docs/ICP.md) · [SPEC: WhatsApp group reminder](docs/specs/recordatorio-grupo-whatsapp.md).

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

Requirements: Node 20+ and Docker (for a local Postgres).

```bash
cp .env.example .env
docker compose up -d   # Postgres on localhost:5432 with databases "school" and "school_test"
npm install
npm run setup          # applies migrations, seeds demo data and prints demo accounts
npm run dev            # http://localhost:3000
```

Without Docker, create two branches in Neon (e.g. `dev` and `test`), put the `dev` connection string in `DATABASE_URL` and `DIRECT_URL`, and set `TEST_DATABASE_URL` to the `test` one when running tests.

Pickup-person photos are stored in the database (`Photo` table), so there's no file storage to set up.

`npm run setup` wipes and reseeds the database; rerun it to start the demo over. It refuses to run unless `DATABASE_URL` points to `localhost`, so it can't wipe Neon by accident. It prints the demo accounts and an invitation code. Fixed ones:

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
7. **WhatsApp group reminder.** On a request's report, each classroom with pending students has **Recordar en WhatsApp**: it opens WhatsApp with a message for the classroom group (counts only, no names) and logs the reminder; the report then shows how many answered after it.
8. **Invitations.** As admin or teacher, **Invitaciones** → choose a classroom → printable slips with codes for guardians without an account.

### Checks

```bash
npm test           # Vitest, against the school_test database (or TEST_DATABASE_URL)
npm run lint
npm run typecheck
```

## Security model

- **Accounts by invitation only.** Codes are 8 random characters, single-use, expire in 14 days, and are stored hashed (shown only once). Redeeming also requires the phone the school or guardian registered, so a leaked code alone isn't enough.
- **Pickup pass.** The 6-digit code is an HMAC of the user and the current 5-minute window. The QR carries a signed token with the same lifetime. The teacher only gets a match for holders linked to **their** students, and delivery re-verifies the pass on the server.
- **Sessions.** HMAC-signed httpOnly cookie, 12 h.
- **Photos.** Served only through `/api/photos/[id]` to users whose scope includes the student (or the person themself).

## Deploy to Vercel + Neon

### 1. Neon

1. Create a project at neon.tech (pick a region close to your Vercel region, e.g. `us-east-1`).
2. In **Connect**, copy two connection strings for the `main` branch:
   - **Pooled** (host contains `-pooler`) → `DATABASE_URL`
   - **Direct** (toggle "Connection pooling" off) → `DIRECT_URL`

### 2. Vercel

1. **Add New → Project** and import the GitHub repository. Framework preset: Next.js (the defaults are fine).
2. **Settings → Environment Variables** (Production):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Neon pooled connection string |
   | `DIRECT_URL` | Neon direct connection string |
   | `TOKEN_SECRET` | output of `openssl rand -base64 48` |
   | `BASE_URL` | your production URL, e.g. `https://escuela.vercel.app` (no trailing slash) |

3. **Deploy.** Vercel runs `npm run vercel-build`, which applies the migrations (`prisma migrate deploy`) and builds the app. Later deploys apply new migrations the same way.

If you change `BASE_URL` (e.g. to a custom domain), redeploy so QR codes and invitation slips use it.

### 3. First accounts

Don't run the demo seed in production: it deletes all data (the script refuses unless `DATABASE_URL` is local). Instead, from your machine, with `DATABASE_URL` and `DIRECT_URL` pointing to Neon:

```bash
npm run create-staff -- ADMIN coordinacion@escuela.mx "Sofía Ramírez"
npm run create-staff -- TEACHER maestra.ana@escuela.mx "Ana López" "1°A,1°B"
```

The password is asked interactively. Running it again for the same email resets the password and reassigns classrooms.

Then, in the app: **Importar** (CSV with students and guardians; classrooms are created if missing) → assign teachers with `create-staff` → **Invitaciones** per classroom.

### Limits to keep in mind

- Vercel caps request bodies at 4.5 MB. Photos are resized in the browser before upload, and the server rejects anything over 4 MB.
- Photos are served only through `/api/photos/[id]` after checking access. Resized photos are ~100–200 KB, so a few hundred fit easily in Neon's free tier.
- Neon's free tier suspends the database when idle, so the first request after a while can take a couple of seconds.

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

- **Staff accounts are created with `npm run create-staff`;** there is no UI to manage teachers yet.
- **Web only, no notifications.** Guardians must open the site to see requests and live pickup requests. The fallback is the guardian's phone, shown to the teacher. Push/email/SMS can be added later without changing the model.
- A student is **authorized** if at least one guardian says yes and none says no; disagreement shows as **Conflicto**. Guardians can change their answer until the deadline.
- **Paper slips** are recorded under the student's first guardian with channel `PAPER`.
- One role per account. A phone that already belongs to a guardian can't also be a pickup-person account.
- A pickup person invited by two families uses the same account (same phone and password).
- Guardians manage pickup people only for **their own** children; another family's authorizations for the same person are untouched.
- Phones with 10 digits are assumed to be Mexican (`+52`). Dates are shown in `America/Mexico_City`.
- Not included in the MVP: login/activation rate limiting, password reset, and data export/deletion tooling.
