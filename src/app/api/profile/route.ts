import { db } from "@/server/db";
import { isResponse, json, readJson, requireUser } from "@/server/http";
import { sanitizeProfile } from "@/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  const u = await requireUser();
  if (isResponse(u)) return u;
  const profile = sanitizeProfile((await readJson(req))?.profile);
  if (!profile) return json(400, { error: "Check age (14-90), height (120-230 cm), weight (30-250 kg) and the other fields." });
  await (await db()).query("UPDATE app_users SET profile = $2::jsonb WHERE id = $1", [u.id, JSON.stringify(profile)]);
  return json(200, { ok: true });
}
