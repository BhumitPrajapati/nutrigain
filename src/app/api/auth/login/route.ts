import { clearFailures, noteFailure, startSession, throttled, verifyPassword } from "@/server/auth";
import { db } from "@/server/db";
import { json, readJson } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readJson(req);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const key = `${req.headers.get("x-forwarded-for") ?? "local"}|${email}`;
  if (throttled(key)) return json(429, { error: "Too many attempts. Wait 15 minutes and try again." });
  const { rows } = await (await db()).query("SELECT id, password_hash FROM app_users WHERE email = $1", [email]);
  if (!rows[0] || !verifyPassword(password, rows[0].password_hash)) {
    noteFailure(key);
    return json(401, { error: "Email or password is incorrect." });
  }
  clearFailures(key);
  await startSession(rows[0].id);
  return json(200, { ok: true });
}
