import webpush from "web-push";

/** Web Push needs a VAPID key pair. Generate one with: npx web-push generate-vapid-keys */
export const pushConfigured = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
export const publicKey = () => process.env.VAPID_PUBLIC_KEY ?? null;

let ready = false;
function init() {
  if (ready) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@example.com", process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  ready = true;
}

export interface Sub { endpoint: string; p256dh: string; auth: string }

/** Returns "ok", "gone" (subscription expired, delete it) or "error". */
export async function sendPush(sub: Sub, payload: { title: string; body: string; tag: string; url?: string }): Promise<"ok" | "gone" | "error"> {
  init();
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 3600 });
    return "ok";
  } catch (e: any) {
    return e?.statusCode === 404 || e?.statusCode === 410 ? "gone" : "error";
  }
}
