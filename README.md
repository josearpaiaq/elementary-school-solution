# School permissions & pickup — MVP

Web app that lets a school collect permission slips and manage who can pick up each student, with parents using **only WhatsApp** and mobile web links (no app install, no accounts).

- **Staff** (admin / teachers): web dashboard.
- **Guardians**: WhatsApp buttons ("Autorizo" / "No autorizo", "Sí" / "No") and a signed link to manage authorized pickup people.

Stack: Next.js 14 (App Router) · TypeScript · Tailwind · Prisma + SQLite · WhatsApp Cloud API · Vitest.

## Run locally

Requirements: Node 20+. No Docker, no database server, no Meta account.

```bash
cp .env.example .env
npm install
npm run setup      # creates prisma/dev.db, applies migrations and seeds demo data
npm run dev        # http://localhost:3000
```

`npm run setup` wipes and reseeds the database, so you can rerun it to start the demo over.

Demo users:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@escuela.test` | `admin123` |
| Teacher (3°A) | `maestra5@escuela.test` | `maestra123` |

Teachers `maestra1` … `maestra12` own classrooms 1°A, 1°B, 2°A … 6°B in that order.

## Demo walkthrough (mock WhatsApp)

In mock mode (`WHATSAPP_MODE="mock"`, the default) nothing is sent to WhatsApp. Messages are stored in the database, and **`/dev/phone`** shows each guardian's chat, where you tap buttons as if you were the parent. Those taps go through the same code path as Meta's webhook.

1. **Permission slip.** Log in as admin → open "Visita al Museo…" (seeded for 3°A and 3°B, already partly answered, with one conflict).
2. Open `/dev/phone` in another tab → pick a guardian under "Mensajes recientes" → tap **Autorizo**. The request page updates.
3. On the request page, click **Enviar recordatorio a pendientes**: only guardians of students with no answer get a message.
4. Create your own request in **Nueva solicitud** → **Enviar por WhatsApp**.
5. **Pickup registry.** In `/dev/phone`, write any text as a guardian: the bot replies with their private link. Open it, add a person with a photo, and the teacher sees them under **Recogida**.
6. **Unregistered person.** As a teacher, go to **Recogida** → search a student → "Llegó una persona no registrada" → type a name → **Pedir autorización**. In `/dev/phone`, open that student's guardian and tap **Sí** or **No**. The teacher screen updates within 3 seconds without reloading. Any "No" wins, and the request expires after 15 minutes.
7. **Opt-in.** As admin, on the dashboard click **Enviar invitación a pendientes** (10% of seeded guardians haven't accepted yet). Accept from `/dev/phone`.

### Checks

```bash
npm test           # Vitest (uses a separate prisma/test.db)
npm run lint
npm run typecheck
```

### Testing the real webhook locally

1. Expose your dev server: `npx cloudflared tunnel --url http://localhost:3000` (or ngrok).
2. Set `BASE_URL` to the tunnel URL and fill in the `WHATSAPP_*` variables (see below). Set `WHATSAPP_MODE="cloud"`.
3. In the Meta app → WhatsApp → Configuration, set the webhook URL to `<tunnel>/api/whatsapp/webhook`, use your `WHATSAPP_VERIFY_TOKEN`, and subscribe to `messages`.
4. Meta's test number can message up to 5 verified recipient phones, which is enough to try the full flow with your own phone.

The cron route can be called manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
```

## Connecting the real WhatsApp Cloud API

1. Create a Meta app (type Business) at developers.facebook.com and add the WhatsApp product.
2. Register the school's phone number and copy the **Phone number ID** and a **permanent access token** (System User in Business Manager).
3. Copy the app secret from App settings → Basic.
4. Submit the templates in `src/lib/whatsapp/templates.ts` (category **Utility**, language **es_MX**, body text from `src/lib/strings.ts`, quick-reply buttons in the listed order):
   - `invitacion_avisos` — 1 param, button "Sí, acepto"
   - `solicitud_autorizacion` — 6 params, buttons "Autorizo", "No autorizo"
   - `recordatorio_autorizacion` — 4 params, buttons "Autorizo", "No autorizo"
   - `autorizacion_recogida` — 2 params, buttons "Sí", "No"
5. Fill `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET` and `WHATSAPP_VERIFY_TOKEN`, set `WHATSAPP_MODE="cloud"`, and configure the webhook as above.

Business-initiated messages use these templates. Confirmations are free-form text, which is allowed because the guardian has just written (24-hour window).

**Cost:** Meta charges per template message (utility category, a few US cents or less in Mexico). Replies within the 24-hour window are free.

## Deployment

- **Vercel + managed Postgres** (Neon, Supabase, Vercel Postgres): change `provider = "sqlite"` to `"postgresql"` in `prisma/schema.prisma`, regenerate migrations (`npx prisma migrate dev --name init` against the new DB), and set the env vars. `vercel.json` schedules `/api/cron/reminders` daily.
- Photos are written to `./storage` on local disk. On serverless hosting, replace the functions in `src/lib/storage.ts` with an S3/R2 client.

## Project layout

```
prisma/schema.prisma, seed.ts
src/lib/
  permissions.ts   authorization rule, reminder rules (pure)
  pickup.ts        live approval rules + DB helpers
  requests.ts      send / remind / report for permission requests
  whatsapp/        client interface, Cloud API + mock, templates, webhook handling
  tokens.ts        HMAC-signed links and sessions
  strings.ts       all Spanish UI and WhatsApp text
src/app/
  (staff)/         dashboard, requests, pickup, import (logged-in staff)
  g/pickup         guardian page (signed link)
  dev/phone        WhatsApp simulator (mock mode only)
  api/             webhook, cron, photos
tests/             Vitest
```

## Assumptions

- **SQLite instead of Postgres + Docker** to keep local setup to `npm install`. The schema has no SQLite-specific features beyond strings for enums.
- A student is **authorized** if at least one guardian says yes and none says no. Disagreement shows as **Conflicto**.
- Guardians can change their answer until the deadline. After that, or once the request is closed, answers are refused.
- **Paper slips** are recorded under the student's first guardian with channel `PAPER`.
- Live pickup approval: any "No" wins, even after a "Sí", until the teacher hands the child over. Pending requests expire after 15 minutes. Delivery re-checks the status server-side.
- Guardian links last 30 days. Writing any message to the school number returns a fresh link.
- Phones without `+` and with 10 digits are assumed to be Mexican (`+52`). Incoming `521…` numbers are matched to the stored `52…` number.
- Dates are shown in `America/Mexico_City`. `datetime-local` inputs are interpreted in the server's time zone.
- Bulk sends are sequential. That is fine for ~450 guardians but should move to a queue at larger scale.
- No rate limiting, no data-export or data-deletion tooling, and no notification to the other guardians when pickup people change. These are deferred beyond the MVP.
