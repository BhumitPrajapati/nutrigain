# NutriGain

Gram-precise food, supplement and water tracking with an automatic muscle-gain target and an end-of-day gap recommender.

    npm install
    npm run dev        # http://localhost:3000
    npm test           # engine unit tests (vitest)

## Where things are
- `src/lib/engine.ts` – Mifflin-St Jeor, TDEE, targets, gap analysis, recommender, hydration, streaks
- `src/data/foods.ts`, `src/data/supplements.ts` – food database (per 100 g) and supplement presets
- `src/components/` – Rings, ScaleLog (log form), GapPanel, WaterTube, Supplements, MealList, WeekChart
- `db/schema.sql` – PostgreSQL schema; `prisma/schema.prisma` – same model for Prisma; `prisma/seed.ts` – loads foods

## Accounts and storage
Sign-up creates an account (email + password, scrypt-hashed, httpOnly session cookie). The profile and every day's log are saved to Postgres
through `/api/*` routes and sync across devices. Data saved on a device before sign-up is moved into the new account.

- **No setup (default):** an embedded Postgres (PGlite) stores data in `./.data/pg`. Good for running on one machine.
- **Production:** set `DATABASE_URL` to a hosted Postgres (Neon, Supabase, Railway). Tables are created on first request. Add `PGSSL=1` if your host needs SSL.
  Because the app signs people in with cookies, host it somewhere with a Node server (Vercel, Railway, Render, Fly), not static hosting.
- **Without a backend** (static hosting or offline) the app falls back to saving in the browser only.

Tables: `app_users` (login + profile JSON), `app_sessions`, `app_days` (one JSON log per user per date). `db/schema.sql` and `prisma/schema.prisma` remain
the fully relational design (meal entries, monthly rollups, recommendations) if you later want to query nutrition data with SQL.

## Dark mode
The Dark/Light button in the header switches themes. It follows your system setting until you pick one, and remembers your choice.

## Custom foods
Body of "My foods" lets you add a food that isn't in the list: type calories, protein, carbs, fat and fiber (plus calcium, iron and potassium if you want)
straight from a label, either per 100 g or per serving. Per-serving values are converted to per 100 g for you, impossible values are rejected, and the
food then appears in search, the end-of-day suggestions and reminders. Custom foods save to your account like everything else.

## Body and mind
A tab for sleep, mood/energy/stress check-in, training log (with rest days), body-weight trend with a lean-gain pace check, guided breathing, daily habits and a
weekly summary. These are self-tracking aids, not medical advice.

## Install as an app
NutriGain is an installable web app (PWA). It must be opened over HTTPS (or `localhost`) to be installable, so deploy it first (see `DEPLOY.md`).
- **Android (Chrome):** menu, then Install app (or tap Install app in the NutriGain header). Long-press the icon for shortcuts: Water, Log food, Body.
- **iPhone / iPad (Safari):** Share, then Add to Home Screen.
- **Windows / Mac / Chromebook (Chrome or Edge):** the install icon in the address bar, or Install app in the header.
- **Shortcuts:** `/?add=water` adds 250 mL, `/?tab=body` opens Body and mind. You can also add these as bookmarks or Home Screen shortcuts.

Home-screen widgets are not possible for a web app on Android or iPhone; they need a native app wrapper (see below).
