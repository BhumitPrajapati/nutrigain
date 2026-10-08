import { json } from "@/server/http";
import { publicKey, pushConfigured } from "@/server/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The browser needs this public key to subscribe. null = this deployment has no push keys, so reminders only work while the app is open. */
export async function GET() {
  return json(200, { publicKey: pushConfigured() ? publicKey() : null });
}
