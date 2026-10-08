import { db } from "@/server/db";
import { isResponse, json, readJson, requireUser } from "@/server/http";
import { sanitizeFoods } from "@/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Replaces the account's custom food list. */
export async function PUT(req: Request) {
  const u = await requireUser();
  if (isResponse(u)) return u;
  const foods = sanitizeFoods((await readJson(req))?.foods);
  if (!foods) return json(400, { error: "A food has an invalid value. Check the name and that protein + carbs + fat is 100 g or less per 100 g." });
  await (await db()).query("UPDATE app_users SET custom_foods = $2::jsonb WHERE id = $1", [u.id, JSON.stringify(foods)]);
  return json(200, { ok: true });
}
