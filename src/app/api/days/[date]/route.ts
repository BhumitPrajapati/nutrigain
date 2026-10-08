import { db } from "@/server/db";
import { isResponse, json, readJson, requireUser } from "@/server/http";
import { isIsoDate, sanitizeDay } from "@/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: { date: string } }) {
  const u = await requireUser();
  if (isResponse(u)) return u;
  if (!isIsoDate(params.date)) return json(400, { error: "Date must look like 2026-10-06." });
  const day = sanitizeDay((await readJson(req))?.day);
  if (!day) return json(400, { error: "That day's log is not valid." });
  await (await db()).query(
    `INSERT INTO app_days (user_id, log_date, data) VALUES ($1,$2,$3::jsonb)
     ON CONFLICT (user_id, log_date) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [u.id, params.date, JSON.stringify(day)]);
  return json(200, { ok: true });
}
