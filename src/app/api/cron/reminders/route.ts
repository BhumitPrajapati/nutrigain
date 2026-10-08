import { timingSafeEqual } from "crypto";
import { localParts } from "@/lib/dates";
import { planReminders, type ReminderKind } from "@/lib/reminders";
import { db } from "@/server/db";
import { json } from "@/server/http";
import { pushConfigured, sendPush } from "@/server/push";
import { sanitizeDay, sanitizeFoods, sanitizeProfile, sanitizeReminders } from "@/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  const a = Buffer.from(given), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Call this every 10-15 minutes from any scheduler (see DEPLOY.md). For each user with reminders on and a subscribed device,
 * it works out what is due in their own time zone and sends it. `?dry=1` returns the plan without sending anything.
 */
async function run(req: Request) {
  if (!authorised(req)) return json(401, { error: "Missing or wrong CRON_SECRET." });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  if (!dry && !pushConfigured()) return json(501, { error: "Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY first." });
  const d = await db();
  const now = new Date();
  const { rows: users } = await d.query(
    `SELECT u.id, u.profile, u.custom_foods, u.reminders, u.reminder_state FROM app_users u
     WHERE u.reminders->>'enabled' = 'true' AND u.profile IS NOT NULL AND EXISTS (SELECT 1 FROM app_push_subs s WHERE s.user_id = u.id)`);
  const report: { user: string; due: unknown[]; sent: number }[] = [];
  for (const u of users) {
    const prefs = sanitizeReminders(u.reminders), profile = sanitizeProfile(u.profile);
    if (!prefs || !profile) continue;
    const { iso } = localParts(now, prefs.tz);
    const { rows: dayRows } = await d.query("SELECT data FROM app_days WHERE user_id = $1 AND log_date = $2", [u.id, iso]);
    const day = sanitizeDay(dayRows[0]?.data) ?? { entries: [], waterMl: 0, supplements: {} };
    const lastSent = (u.reminder_state ?? {}) as Partial<Record<ReminderKind, string>>;
    const due = planReminders({ now, prefs, profile, day, customFoods: sanitizeFoods(u.custom_foods) ?? [], lastSent });
    let sent = 0;
    if (due.length && !dry) {
      const { rows: subs } = await d.query("SELECT endpoint, p256dh, auth FROM app_push_subs WHERE user_id = $1", [u.id]);
      for (const r of due) {
        let ok = false;
        for (const s of subs) {
          const res = await sendPush(s, { title: r.title, body: r.body, tag: r.tag });
          if (res === "ok") ok = true;
          if (res === "gone") await d.query("DELETE FROM app_push_subs WHERE endpoint = $1", [s.endpoint]);
        }
        if (ok) { lastSent[r.kind] = now.toISOString(); sent++; }
      }
      if (sent) await d.query("UPDATE app_users SET reminder_state = $2::jsonb WHERE id = $1", [u.id, JSON.stringify(lastSent)]);
    }
    report.push({ user: u.id.slice(0, 8), due: dry ? due : due.map((r) => r.kind), sent });
  }
  return json(200, { ok: true, dry, checked: users.length, report });
}

export const GET = run;
export const POST = run;
