import { endSession } from "@/server/auth";
import { json } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await endSession();
  return json(200, { ok: true });
}
