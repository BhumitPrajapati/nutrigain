import { db } from "@/server/db";
import { isResponse, json, readJson, requireUser } from "@/server/http";
import { isIsoDate, sanitizeDay, sanitizeFoods, sanitizeProfile, sanitizeReminders } from "@/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Everything the app needs on load: profile + all logged days. */
export async function GET() {
  const u = await requireUser();
  if (isResponse(u)) return u;
  const d = await db();
  const [{ rows: p }, { rows: days }] = await Promise.all([
    d.query("SELECT profile, custom_foods, reminders FROM app_users WHERE id = $1", [u.id]),
    d.query("SELECT log_date, data FROM app_days WHERE user_id = $1 ORDER BY log_date DESC LIMIT 400", [u.id]),
  ]);
  return json(200, {
    user: { email: u.email },
    profile: p[0]?.profile ?? null,
    customFoods: p[0]?.custom_foods ?? [],
    reminders: p[0]?.reminders ?? null,
    days: Object.fromEntries(days.map((r: any) => [r.log_date, r.data])),
  });
}

/** One-time import of data that was saved on this device before the account existed. */
export async function PUT(req: Request) {
  const u = await requireUser();
  if (isResponse(u)) return u;
  const body = await readJson(req);
  const profile = sanitizeProfile(body?.profile);
  if (!profile) return json(400, { error: "Profile is missing or invalid." });
  const d = await db();
  await d.query("UPDATE app_users SET profile = $2::jsonb WHERE id = $1", [u.id, JSON.stringify(profile)]);
  const foods = sanitizeFoods(body?.customFoods ?? []);
  if (foods) await d.query("UPDATE app_users SET custom_foods = $2::jsonb WHERE id = $1", [u.id, JSON.stringify(foods)]);
  const rem = sanitizeReminders(body?.reminders);
  if (rem) await d.query("UPDATE app_users SET reminders = $2::jsonb WHERE id = $1", [u.id, JSON.stringify(rem)]);
  let saved = 0;
  for (const [date, raw] of Object.entries(body?.days ?? {}).slice(0, 400)) {
    const day = isIsoDate(date) ? sanitizeDay(raw) : null;
    if (!day) continue;
    await d.query(
      `INSERT INTO app_days (user_id, log_date, data) VALUES ($1,$2,$3::jsonb)
       ON CONFLICT (user_id, log_date) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [u.id, date, JSON.stringify(day)]);
    saved++;
  }
  return json(200, { ok: true, days: saved });
}

/** Erase all of this account's data (keeps the login). */
export async function DELETE() {
  const u = await requireUser();
  if (isResponse(u)) return u;
  const d = await db();
  await d.query("DELETE FROM app_days WHERE user_id = $1", [u.id]);
  await d.query("UPDATE app_users SET profile = NULL, custom_foods = '[]'::jsonb, reminders = NULL, reminder_state = '{}'::jsonb WHERE id = $1", [u.id]);
  await d.query("DELETE FROM app_push_subs WHERE user_id = $1", [u.id]);
  return json(200, { ok: true });
}
