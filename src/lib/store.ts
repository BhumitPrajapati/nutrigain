"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DayLog, Food, Profile, ReminderPrefs } from "./types";
import { DEFAULT_REMINDERS } from "./reminders";
import { computeTargets } from "./engine";

const LOCAL_KEY = "nutrigain:v1";
const GUEST_KEY = "nutrigain:guest";

export const localIso = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const nowHHMM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
export const shiftIso = (iso: string, days: number) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + days); return localIso(d); };
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const blank = (): DayLog => ({ entries: [], waterMl: 0, supplements: {} });

export interface State { profile: Profile | null; days: Record<string, DayLog>; customFoods: Food[]; reminders: ReminderPrefs }
const emptyState = (): State => ({ profile: null, days: {}, customFoods: [], reminders: DEFAULT_REMINDERS });
/** loading: asking the server · anon: signed out, needs to choose · local: this device only · cloud: signed in, saved to the database */
export type Mode = "loading" | "anon" | "local" | "cloud";
export type SyncStatus = "saved" | "saving" | "error";

async function api(url: string, init?: RequestInit): Promise<{ status: number; data: any }> {
  try {
    const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
    let data: any = null;
    try { data = await r.json(); } catch { /* empty body */ }
    return { status: r.status, data };
  } catch {
    return { status: 0, data: null };
  }
}

function readLocal(): State {
  try { const raw = localStorage.getItem(LOCAL_KEY); if (raw) return { ...emptyState(), ...JSON.parse(raw) }; } catch { /* private mode */ }
  return emptyState();
}

export function useNutriStore() {
  const [state, setState] = useState<State>(emptyState());
  const [mode, setMode] = useState<Mode>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncStatus>("saved");
  const [retry, setRetry] = useState(0);

  const stateRef = useRef(state); stateRef.current = state;
  const blankSaved = () => ({ profile: "null", days: new Map<string, string>(), foods: "[]", reminders: JSON.stringify(DEFAULT_REMINDERS) });
  const saved = useRef(blankSaved());
  const flushing = useRef(false);

  const applyCloud = useCallback((data: { user: { email: string }; profile: Profile | null; days: Record<string, DayLog>; customFoods?: Food[]; reminders?: ReminderPrefs | null }) => {
    const reminders = data.reminders ?? DEFAULT_REMINDERS;
    const customFoods = data.customFoods ?? [];
    saved.current = { profile: JSON.stringify(data.profile), days: new Map(Object.entries(data.days).map(([k, v]) => [k, JSON.stringify(v)])), foods: JSON.stringify(customFoods), reminders: JSON.stringify(reminders) };
    setState({ profile: data.profile, days: data.days, customFoods, reminders });
    setEmail(data.user.email);
    setSync("saved");
    setMode("cloud");
  }, []);

  /* boot: signed in? -> cloud. Otherwise device-only data, or ask the person to choose. */
  useEffect(() => {
    (async () => {
      const r = await api("/api/state");
      if (r.status === 200) return applyCloud(r.data);
      const local = readLocal();
      setState(local);
      let guest = false;
      try { guest = localStorage.getItem(GUEST_KEY) === "1"; } catch { /* ignore */ }
      // 401 = server reachable but signed out. 0/5xx = no backend (static hosting, offline): fall back to this device.
      setMode(r.status === 401 && !guest ? "anon" : "local");
    })();
  }, [applyCloud]);

  /* device-only persistence */
  useEffect(() => {
    if (mode !== "local") return;
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state)); } catch { /* quota or private mode */ }
  }, [state, mode]);

  /* cloud persistence: send whatever differs from what the server last confirmed */
  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      const s = stateRef.current;
      const jobs: Promise<boolean>[] = [];
      const profileJson = JSON.stringify(s.profile);
      if (s.profile && profileJson !== saved.current.profile) {
        jobs.push(api("/api/profile", { method: "PUT", body: JSON.stringify({ profile: s.profile }) }).then((r) => {
          if (r.status === 200) saved.current.profile = profileJson;
          return r.status === 200;
        }));
      }
      const foodsJson = JSON.stringify(s.customFoods);
      if (foodsJson !== saved.current.foods) {
        jobs.push(api("/api/foods", { method: "PUT", body: JSON.stringify({ foods: s.customFoods }) }).then((r) => {
          if (r.status === 200) saved.current.foods = foodsJson;
          return r.status === 200;
        }));
      }
      const remJson = JSON.stringify(s.reminders);
      if (s.profile && remJson !== saved.current.reminders) {
        jobs.push(api("/api/reminders", { method: "PUT", body: JSON.stringify({ reminders: s.reminders }) }).then((r) => {
          if (r.status === 200) saved.current.reminders = remJson;
          return r.status === 200;
        }));
      }
      for (const [date, day] of Object.entries(s.days)) {
        const j = JSON.stringify(day);
        if (saved.current.days.get(date) === j) continue;
        jobs.push(api(`/api/days/${date}`, { method: "PUT", body: JSON.stringify({ day }) }).then((r) => {
          if (r.status === 200) saved.current.days.set(date, j);
          return r.status === 200;
        }));
      }
      if (jobs.length === 0) { setSync("saved"); return; }
      setSync("saving");
      const ok = (await Promise.all(jobs)).every(Boolean);
      setSync(ok ? "saved" : "error");
      if (!ok) setTimeout(() => setRetry((n) => n + 1), 5000);
    } finally {
      flushing.current = false;
    }
  }, []);

  useEffect(() => {
    if (mode !== "cloud") return;
    const t = setTimeout(flush, 500);
    return () => clearTimeout(t);
  }, [state, mode, retry, flush]);

  useEffect(() => {
    if (mode !== "cloud") return;
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [mode, flush]);

  const mutate = useCallback((iso: string, fn: (d: DayLog) => DayLog) => {
    setState((s) => {
      let next = fn(s.days[iso] ?? blank());
      if (!next.targetsSnapshot && s.profile) next = { ...next, targetsSnapshot: computeTargets(s.profile, s.profile.creatine !== false) };
      return { ...s, days: { ...s.days, [iso]: next } };
    });
  }, []);

  /** Returns an error message, or null on success. Device-only data is moved into a brand-new account. */
  const authenticate = useCallback(async (kind: "login" | "register", emailIn: string, password: string): Promise<string | null> => {
    const r = await api(`/api/auth/${kind}`, { method: "POST", body: JSON.stringify({ email: emailIn, password }) });
    if (r.status !== 200 && r.status !== 201) return r.data?.error ?? "Could not reach the server. Check your connection and try again.";
    const s = await api("/api/state");
    if (s.status !== 200) return "Signed in, but your data could not be loaded. Reload the page.";
    const local = stateRef.current;
    if (!s.data.profile && local.profile) {
      const up = await api("/api/state", { method: "PUT", body: JSON.stringify({ profile: local.profile, days: local.days, customFoods: local.customFoods, reminders: local.reminders }) });
      if (up.status === 200) {
        const s2 = await api("/api/state");
        if (s2.status === 200) {
          try { localStorage.removeItem(LOCAL_KEY); localStorage.removeItem(GUEST_KEY); } catch { /* ignore */ }
          applyCloud(s2.data);
          return null;
        }
      }
    }
    applyCloud(s.data);
    return null;
  }, [applyCloud]);

  return {
    mode, email, sync,
    profile: state.profile,
    days: state.days,
    customFoods: state.customFoods,
    reminders: state.reminders,
    saveFood: (f: Food) => setState((s) => ({ ...s, customFoods: s.customFoods.some((x) => x.id === f.id) ? s.customFoods.map((x) => (x.id === f.id ? f : x)) : [...s.customFoods, f] })),
    removeFood: (id: string) => setState((s) => ({ ...s, customFoods: s.customFoods.filter((x) => x.id !== id) })),
    setReminders: (r: ReminderPrefs) => setState((s) => ({ ...s, reminders: r })),
    /** replace one day wholesale (check-in, workout, weight, habits...) */
    updateDay: (iso: string, fn: (d: DayLog) => DayLog) => mutate(iso, fn),
    getDay: (iso: string): DayLog => state.days[iso] ?? blank(),
    login: (e: string, p: string) => authenticate("login", e, p),
    register: (e: string, p: string) => authenticate("register", e, p),
    logout: async () => {
      await api("/api/auth/logout", { method: "POST" });
      saved.current = blankSaved();
      setEmail(null);
      setState(readLocal());
      setMode("anon");
    },
    useThisDeviceOnly: () => { try { localStorage.setItem(GUEST_KEY, "1"); } catch { /* ignore */ } setMode("local"); },
    chooseAccount: () => { try { localStorage.removeItem(GUEST_KEY); } catch { /* ignore */ } setMode("anon"); },
    hasDeviceData: !!state.profile && mode !== "cloud",
    saveProfile: (p: Profile) =>
      setState((s) => {
        // today's frozen targets would be stale after an edit
        const today = localIso();
        const days = { ...s.days };
        if (days[today]) days[today] = { ...days[today], targetsSnapshot: undefined };
        return { ...s, profile: p, days };
      }),
    addEntries: (iso: string, items: { foodId: string; grams: number }[], time: string) =>
      mutate(iso, (d) => ({ ...d, entries: [...d.entries, ...items.map((i) => ({ id: uid(), foodId: i.foodId, grams: i.grams, time }))] })),
    removeEntry: (iso: string, id: string) => mutate(iso, (d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) })),
    addWater: (iso: string, ml: number) => mutate(iso, (d) => ({ ...d, waterMl: Math.max(0, d.waterMl + ml) })),
    changeDose: (iso: string, id: string, delta: number) =>
      mutate(iso, (d) => ({ ...d, supplements: { ...d.supplements, [id]: Math.max(0, (d.supplements[id] ?? 0) + delta) } })),
    reset: async () => {
      if (mode === "cloud") {
        const r = await api("/api/state", { method: "DELETE" });
        if (r.status !== 200) { setSync("error"); return; }
        saved.current = blankSaved();
      } else {
        try { localStorage.removeItem(LOCAL_KEY); } catch { /* ignore */ }
      }
      setState(emptyState());
    },
  };
}
