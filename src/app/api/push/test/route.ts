import { db } from "@/server/db";
import { isResponse, json, requireUser } from "@/server/http";
import { pushConfigured, sendPush } from "@/server/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const u = await requireUser();
  if (isResponse(u)) return u;
  if (!pushConfigured()) return json(501, { error: "This server has no push keys set (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)." });
  const d = await db();
  const { rows } = await d.query("SELECT endpoint, p256dh, auth FROM app_push_subs WHERE user_id = $1", [u.id]);
  if (!rows.length) return json(404, { error: "No device is subscribed yet. Turn on reminders first." });
  let sent = 0;
  for (const r of rows) {
    const res = await sendPush(r, { title: "NutriGain test", body: "Background reminders are working on this device.", tag: "nutrigain-test" });
    if (res === "ok") sent++;
    if (res === "gone") await d.query("DELETE FROM app_push_subs WHERE endpoint = $1", [r.endpoint]);
  }
  return json(sent ? 200 : 502, sent ? { sent } : { error: "The push service rejected the message. Turn reminders off and on again." });
}
