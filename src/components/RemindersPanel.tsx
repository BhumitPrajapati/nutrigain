"use client";
import { useState } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { disableNotifications, enableNotifications, showNotification } from "@/lib/notify";
import type { Reminder } from "@/lib/reminders";
import type { ReminderPrefs } from "@/lib/types";

interface PushInfo { permission: NotificationPermission | "unsupported"; pushActive: boolean; serverHasKeys: boolean; refresh: () => void }

function Toggle({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-start gap-3 py-3 ${disabled ? "opacity-50" : ""}`}>
      <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-protein" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span><span className="block font-semibold">{label}</span>{hint && <span className="block text-sm text-ink2">{hint}</span>}</span>
    </label>
  );
}

export default function RemindersPanel({ prefs, onChange, signedIn, push, preview }: {
  prefs: ReminderPrefs; onChange: (p: ReminderPrefs) => void; signedIn: boolean; push: PushInfo; preview: Reminder[];
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
  const set = (patch: Partial<ReminderPrefs>) => onChange({ ...prefs, ...patch, tz: tz() });

  const turnOn = async () => {
    setBusy(true); setMsg("");
    const r = await enableNotifications(signedIn);
    if (!r.ok) setMsg(r.error ?? "Could not turn on notifications.");
    else { onChange({ ...prefs, enabled: true, tz: tz() }); setMsg(r.push ? "Background reminders are on for this device." : ""); }
    push.refresh(); setBusy(false);
  };
  const turnOff = async () => { setBusy(true); await disableNotifications(); onChange({ ...prefs, enabled: false }); push.refresh(); setBusy(false); setMsg(""); };
  const test = async () => {
    setBusy(true); setMsg("");
    if (push.pushActive && signedIn) {
      try {
        const r = await fetch("/api/push/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        setMsg(r.ok ? "Sent. It should arrive in a few seconds." : (await r.json()).error ?? "Test failed.");
      } catch { setMsg("Could not reach the server."); }
    } else {
      const ok = await showNotification({ title: "NutriGain test", body: "Reminders can reach you on this device.", tag: "nutrigain-test" });
      setMsg(ok ? "Test notification shown." : "Could not show a notification. Check your browser's site settings.");
    }
    setBusy(false);
  };

  const status =
    push.permission === "unsupported" ? "This browser can't show notifications."
    : push.permission === "denied" ? "Notifications are blocked for this site. Allow them in your browser's site settings, then turn reminders on."
    : !prefs.enabled ? "Reminders are off."
    : push.pushActive ? "Background reminders are on. You will get them even when NutriGain is closed."
    : !signedIn ? "Reminders show while NutriGain is open in a browser tab. Sign in to also get them when it is closed."
    : !push.serverHasKeys ? "Reminders show while NutriGain is open. This server has no push keys yet, so closed-app reminders are off (see DEPLOY.md)."
    : "Reminders show while NutriGain is open. Turn them off and on again to enable closed-app reminders.";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <section className="panel p-5 sm:p-6 lg:col-span-7" aria-labelledby="rem-h">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="rem-h" className="font-display text-xl font-bold">Reminders</h2>
          {prefs.enabled
            ? <button className="btn-ghost" onClick={turnOff} disabled={busy}><BellOff size={14} aria-hidden /> Turn off</button>
            : <button className="btn-ink" onClick={turnOn} disabled={busy || push.permission === "unsupported"}><Bell size={14} aria-hidden /> Turn on reminders</button>}
        </div>
        <p role="status" className="mt-3 text-ink2">{status}</p>
        {msg && <p role="status" className="mt-2 rounded-xl bg-surface px-3 py-2 text-sm">{msg}</p>}

        <div className="mt-4 divide-y divide-line border-t border-line">
          <div>
            <Toggle label="Drink water" hint="Only when you are behind the pace for the time of day. Stricter with creatine." checked={prefs.water} onChange={(v) => set({ water: v })} />
            {prefs.water && (
              <label className="mb-3 ml-8 flex items-center gap-2 text-sm text-ink2">No more often than every
                <select className="rounded-lg border border-line bg-surface px-2 py-1 text-ink" value={prefs.waterEveryMin} onChange={(e) => set({ waterEveryMin: Number(e.target.value) })}>
                  {[60, 90, 120, 180].map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
              </label>
            )}
          </div>
          <div>
            <Toggle label="Eat something nutrient-rich" hint="After a long gap since your last logged meal. Picks a food for the vitamin or mineral you are lowest on, within your diet and skip list." checked={prefs.food} onChange={(v) => set({ food: v })} />
            {prefs.food && (
              <label className="mb-3 ml-8 flex items-center gap-2 text-sm text-ink2">After
                <select className="rounded-lg border border-line bg-surface px-2 py-1 text-ink" value={prefs.foodEveryHours} onChange={(e) => set({ foodEveryHours: Number(e.target.value) })}>
                  {[3, 4, 5, 6].map((h) => <option key={h} value={h}>{h} hours</option>)}
                </select> without logging food
              </label>
            )}
          </div>
          <div>
            <Toggle label="Close out the day" hint="One evening message with what to eat to hit your protein and calories." checked={prefs.closeout} onChange={(v) => set({ closeout: v })} />
            {prefs.closeout && (
              <label className="mb-3 ml-8 flex items-center gap-2 text-sm text-ink2">Send at
                <input type="time" className="rounded-lg border border-line bg-surface px-2 py-1 text-ink" value={prefs.closeoutTime} onChange={(e) => e.target.value && set({ closeoutTime: e.target.value })} />
              </label>
            )}
          </div>
          <div className="py-3">
            <p className="font-semibold">Quiet hours</p>
            <p className="text-sm text-ink2">No reminders in this window.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink2">
              <input aria-label="Quiet hours start" type="time" className="rounded-lg border border-line bg-surface px-2 py-1 text-ink" value={prefs.quietStart} onChange={(e) => e.target.value && set({ quietStart: e.target.value })} />
              to
              <input aria-label="Quiet hours end" type="time" className="rounded-lg border border-line bg-surface px-2 py-1 text-ink" value={prefs.quietEnd} onChange={(e) => e.target.value && set({ quietEnd: e.target.value })} />
            </div>
          </div>
        </div>
        <button className="btn-ghost mt-2" onClick={test} disabled={busy || push.permission !== "granted"}><Send size={14} aria-hidden /> Send a test</button>
      </section>

      <section className="panel p-5 sm:p-6 lg:col-span-5" aria-labelledby="prev-h">
        <h2 id="prev-h" className="font-display text-xl font-bold">What would be sent right now</h2>
        {preview.length === 0
          ? <p className="mt-3 text-ink2">Nothing is due. You are on pace for water and food right now.</p>
          : <ul className="mt-3 grid gap-3">{preview.map((r) => (
              <li key={r.kind} className="rounded-xl border border-line bg-surface p-4">
                <p className="font-semibold">{r.title}</p>
                <p className="mt-1 text-sm text-ink2">{r.body}</p>
              </li>))}</ul>}
        <p className="mt-4 text-sm text-ink2">This uses today's log, your diet and your skip list, ignoring quiet hours so you can see it.</p>
      </section>
    </div>
  );
}
