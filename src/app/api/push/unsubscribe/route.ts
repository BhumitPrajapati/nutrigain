import { db } from "@/server/db";
import { isResponse, json, readJson, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const u = await requireUser();
  if (isResponse(u)) return u;
  const endpoint = (await readJson(req))?.endpoint;
  const d = await db();
  if (typeof endpoint === "string") await d.query("DELETE FROM app_push_subs WHERE endpoint = $1 AND user_id = $2", [endpoint, u.id]);
  else await d.query("DELETE FROM app_push_subs WHERE user_id = $1", [u.id]);
  return json(200, { ok: true });
}
