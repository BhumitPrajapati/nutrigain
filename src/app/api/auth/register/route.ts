import { hashPassword, newUserId, startSession } from "@/server/auth";
import { db } from "@/server/db";
import { json, readJson } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readJson(req);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return json(400, { error: "Enter a valid email address." });
  if (password.length < 8 || password.length > 200) return json(400, { error: "Use a password with at least 8 characters." });
  const d = await db();
  const id = newUserId();
  try {
    await d.query("INSERT INTO app_users (id, email, password_hash) VALUES ($1,$2,$3)", [id, email, hashPassword(password)]);
  } catch {
    return json(409, { error: "An account with that email already exists. Sign in instead." });
  }
  await startSession(id);
  return json(201, { ok: true });
}
