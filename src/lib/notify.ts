"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { planReminders, type Reminder, type ReminderKind } from "./reminders";
import type { DayLog, Food, Profile, ReminderPrefs } from "./types";
import { localParts } from "./dates";

const SENT_KEY = "nutrigain:lastSent";

export const notificationsSupported = () => typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;

async function postJson(url: string, body: unknown) {
  try { const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return r.status; } catch { return 0; }
}

export async function registerWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try { return await navigator.serviceWorker.register("/sw.js"); } catch { return null; }
}

function keyToBytes(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function serverPushKey(): Promise<string | null> {
  try { const r = await fetch("/api/push/key"); return r.ok ? (await r.json()).publicKey ?? null : null; } catch { return null; }
}

/** Ask permission, register the worker, and subscribe for background push when the server supports it and the user is signed in. */
export async function enableNotifications(signedIn: boolean): Promise<{ ok: boolean; push: boolean; error?: string }> {
  if (!notificationsSupported()) return { ok: false, push: false, error: "This browser does not support notifications." };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, push: false, error: "Notifications are blocked. Allow them in your browser's site settings, then try again." };
  const reg = await registerWorker();
  if (!reg) return { ok: true, push: false };
  const key = signedIn ? await serverPushKey() : null;
  if (!key) return { ok: true, push: false };
  try {
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key) as BufferSource }));
    const status = await postJson("/api/push/subscribe", { subscription: sub.toJSON(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
    return { ok: true, push: status === 200 };
  } catch {
    return { ok: true, push: false };
  }
}

export async function disableNotifications(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) { await postJson("/api/push/unsubscribe", { endpoint: sub.endpoint }); await sub.unsubscribe(); }
  } catch { /* ignore */ }
}

export async function showNotification(r: { title: string; body: string; tag: string }): Promise<boolean> {
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  try {
    const reg = (await navigator.serviceWorker.getRegistration()) ?? (await registerWorker());
    if (reg) { await reg.showNotification(r.title, { body: r.body, tag: r.tag, icon: "/icon-192.png", badge: "/icon-192.png" }); return true; }
    new Notification(r.title, { body: r.body, tag: r.tag });
    return true;
  } catch { return false; }
}

/** Current permission plus whether this device already has a background push subscription. */
export function usePushState(refreshKey: unknown) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [pushActive, setPushActive] = useState(false);
  const [serverHasKeys, setServerHasKeys] = useState(false);
  const refresh = useCallback(async () => {
    if (!notificationsSupported()) { setPermission("unsupported"); return; }
    setPermission(Notification.permission);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      setPushActive(!!(await reg?.pushManager.getSubscription()));
    } catch { setPushActive(false); }
    setServerHasKeys(!!(await serverPushKey()));
  }, []);
  useEffect(() => { refresh(); }, [refresh, refreshKey]);
  return { permission, pushActive, serverHasKeys, refresh };
}

/**
 * Fallback for when there is no background push: while NutriGain is open, check every minute and notify.
 * `lastSent` lives in localStorage so a reload does not repeat a reminder.
 */
export function useInPageReminders(opts: { active: boolean; prefs: ReminderPrefs; profile: Profile | null; getDay: (iso: string) => DayLog; customFoods: Food[] }) {
  const ref = useRef(opts); ref.current = opts;
  useEffect(() => {
    if (!opts.active) return;
    const tick = async () => {
      const { prefs, profile, getDay, customFoods } = ref.current;
      if (!profile || !prefs.enabled || !notificationsSupported() || Notification.permission !== "granted") return;
      let lastSent: Partial<Record<ReminderKind, string>> = {};
      try { lastSent = JSON.parse(localStorage.getItem(SENT_KEY) ?? "{}"); } catch { /* ignore */ }
      const now = new Date();
      const due: Reminder[] = planReminders({ now, prefs, profile, day: getDay(localParts(now, prefs.tz).iso), customFoods, lastSent });
      for (const r of due) {
        if (await showNotification(r)) lastSent[r.kind] = now.toISOString();
      }
      if (due.length) { try { localStorage.setItem(SENT_KEY, JSON.stringify(lastSent)); } catch { /* ignore */ } }
    };
    const id = setInterval(tick, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    tick();
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [opts.active]);
}
