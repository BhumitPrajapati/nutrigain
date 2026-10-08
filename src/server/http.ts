import { NextResponse } from "next/server";
import { sessionUser, type SessionUser } from "./auth";

export const json = (status: number, body: unknown) => NextResponse.json(body, { status });

/** Mutating requests must be JSON. A cross-site HTML form cannot send that, which blocks basic CSRF. */
export async function readJson(req: Request): Promise<any | null> {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return null;
  try { return await req.json(); } catch { return null; }
}

export async function requireUser(): Promise<SessionUser | NextResponse> {
  const u = await sessionUser();
  return u ?? json(401, { error: "Sign in to continue." });
}
export const isResponse = (x: unknown): x is NextResponse => x instanceof NextResponse;
