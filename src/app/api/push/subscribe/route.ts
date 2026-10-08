import { db } from "@/server/db";
import { isResponse, json, readJson, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const u = await requireUser();
  if (isResponse(u)) return u;
  const b = await readJson(req);
  const s = b?.subscription;
  if (!s || typeof s.endpoint !== "string" || !s.endpoint.startsWith("https://") || s.endpoint.length > 1000 || typeof s.keys?.p256dh !== "string" || typeof s.keys?.auth !== "string") {
    return json(400, { error: "That push subscription is not valid." });
  }
  const tz = typeof b.tz === "string" && b.tz.length <= 64 ? b.tz : "UTC";
  await (await db()).query(
    `INSERT INTO app_push_subs (endpoint, user_id, p256dh, auth, tz) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, tz = EXCLUDED.tz`,
    [s.endpoint, u.id, s.keys.p256dh, s.keys.auth, tz]);
  return json(200, { ok: true });
}
