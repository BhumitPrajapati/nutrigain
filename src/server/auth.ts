import { createHash, randomBytes, randomUUID } from "crypto";
import { hashPassword, verifyPassword } from "./auth-crypto";
export { hashPassword, verifyPassword };
import { cookies } from "next/headers";
import { db } from "./db";

const COOKIE = "ng_session";
const SESSION_DAYS = 30;

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export const newUserId = () => randomUUID();

export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  const d = await db();
  await d.query("INSERT INTO app_sessions (token_hash, user_id, expires_at) VALUES ($1,$2,$3)", [sha(token), userId, expires.toISOString()]);
  d.query("DELETE FROM app_sessions WHERE expires_at < now()").catch(() => {});
  cookies().set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires });
}

export async function endSession(): Promise<void> {
  const token = cookies().get(COOKIE)?.value;
  if (token) await (await db()).query("DELETE FROM app_sessions WHERE token_hash = $1", [sha(token)]);
  cookies().set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export interface SessionUser { id: string; email: string }

export async function sessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const { rows } = await (await db()).query(
    `SELECT u.id, u.email FROM app_sessions s JOIN app_users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`, [sha(token)]);
  return rows[0] ?? null;
}

/* tiny in-memory throttle: 10 failed attempts per 15 minutes per ip+email */
const fails = new Map<string, { n: number; until: number }>();
export function throttled(key: string): boolean {
  const f = fails.get(key);
  return !!f && f.until > Date.now() && f.n >= 10;
}
export function noteFailure(key: string) {
  const f = fails.get(key);
  if (!f || f.until <= Date.now()) fails.set(key, { n: 1, until: Date.now() + 15 * 60_000 });
  else f.n++;
}
export const clearFailures = (key: string) => fails.delete(key);
