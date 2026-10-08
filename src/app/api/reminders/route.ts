import { db } from "@/server/db";
import { isResponse, json, readJson, requireUser } from "@/server/http";
import { sanitizeReminders } from "@/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  const u = await requireUser();
  if (isResponse(u)) return u;
  const prefs = sanitizeReminders((await readJson(req))?.reminders);
  if (!prefs) return json(400, { error: "Reminder settings are not valid." });
  await (await db()).query("UPDATE app_users SET reminders = $2::jsonb WHERE id = $1", [u.id, JSON.stringify(prefs)]);
  return json(200, { ok: true });
}
