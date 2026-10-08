# Deploying NutriGain

1. **Host**: any Node host (Vercel, Railway, Render, Fly). Static hosting will not work because sign-in and saving use API routes.
2. **Database**: create a Postgres database (Neon, Supabase, Railway) and set `DATABASE_URL` (add `PGSSL=1` if your host requires SSL). Tables are created on first request.
3. **Background reminders (optional)**
   - `npx web-push generate-vapid-keys`, then set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`.
   - Set `CRON_SECRET` to a long random string.
   - Have a scheduler (Vercel Cron, GitHub Actions, cron-job.org) call `POST https://your-app/api/cron/reminders` every 10-15 minutes with the header `Authorization: Bearer <CRON_SECRET>`.
     Add `?dry=1` to see what would be sent without sending anything.
   - Phones need the site over HTTPS. On iPhone, add the site to the Home Screen first; web push only works for installed web apps there.
   - Without these keys, reminders still work while the app is open in a browser tab.

## Installing and widgets
- The app installs from the browser (see README, "Install as an app") once it is served over HTTPS.
- **Widgets:** Android and iOS only allow home-screen widgets from native apps. To get one, wrap this site in a native shell (Capacitor) and add a widget in
  Android Studio (Kotlin, Jetpack Glance) and/or Xcode (SwiftUI WidgetKit) that reads `GET /api/state` with the user's session. That needs those tools on your computer.
  Microsoft Edge on Windows 11 can show PWA widgets in the Widgets board, which is not built here.
