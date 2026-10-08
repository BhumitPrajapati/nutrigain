"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LogIn, LogOut, RotateCcw, SlidersHorizontal } from "lucide-react";
import { FOODS } from "@/data/foods";
import { computeGap, computeTargets, dayHit, dayTotals, hydrationStatus, recommend, streak } from "@/lib/engine";
import { useInPageReminders, usePushState } from "@/lib/notify";
import { planReminders } from "@/lib/reminders";
import { localIso, nowHHMM, shiftIso, useNutriStore } from "@/lib/store";
import type { Food, Profile, Suggestion } from "@/lib/types";
import { weightTrend } from "@/lib/wellness";
import { CheckInCard, HabitsCard, TrainingCard, WeekInsights, WeightCard } from "./BodyMind";
import Breathe from "./Breathe";
import FoodForm from "./FoodForm";
import GapPanel from "./GapPanel";
import MealList from "./MealList";
import MyFoods from "./MyFoods";
import ProfileForm from "./ProfileForm";
import Rings from "./Rings";
import RemindersPanel from "./RemindersPanel";
import ScaleLog from "./ScaleLog";
import Supplements from "./Supplements";
import InstallButton from "./InstallButton";
import ThemeToggle from "./ThemeToggle";
import WaterTube from "./WaterTube";
import WeekChart, { WeekPoint } from "./WeekChart";

type Store = ReturnType<typeof useNutriStore>;
type Tab = "today" | "body" | "foods" | "reminders";
const TABS: [Tab, string][] = [["today", "Today"], ["body", "Body and mind"], ["foods", "My foods"], ["reminders", "Reminders"]];

export default function Dashboard({ store, profile }: { store: Store; profile: Profile }) {
  const [iso, setIso] = useState(localIso());
  const [tab, setTab] = useState<Tab>("today");
  const [editing, setEditing] = useState(false);
  const [foodEditor, setFoodEditor] = useState<{ food?: Food } | null>(null);
  const [selectId, setSelectId] = useState<string | undefined>();
  const [toast, setToast] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 60_000); return () => clearInterval(t); }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 4000); return () => clearTimeout(t); }, [toast]);

  /* home-screen shortcuts: /?tab=body opens a tab, /?add=water logs 250 mL once */
  const shortcutDone = useRef(false);
  useEffect(() => {
    if (shortcutDone.current) return;
    shortcutDone.current = true;
    const q = new URLSearchParams(window.location.search);
    const t = q.get("tab");
    if (t && TABS.some(([k]) => k === t)) setTab(t as Tab);
    if (q.get("add") === "water") { store.addWater(localIso(), 250); setToast("Added 250 mL of water."); }
    if (q.has("tab") || q.has("add")) window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = localIso();
  const isToday = iso === today;
  const creatine = profile.creatine !== false;
  const day = store.getDay(iso);
  const now = new Date();
  const hour = isToday ? now.getHours() + now.getMinutes() / 60 : 22;
  void tick;

  const allFoods = useMemo(() => [...FOODS, ...store.customFoods], [store.customFoods]);
  const byId = useMemo(() => Object.fromEntries(allFoods.map((f) => [f.id, f])) as Record<string, Food>, [allFoods]);

  const currentTargets = useMemo(() => computeTargets(profile, creatine), [profile, creatine]);
  const targets = isToday ? currentTargets : day.targetsSnapshot ?? currentTargets;
  const logged = useMemo(() => dayTotals(day, byId), [day, byId]);
  const report = useMemo(() => computeGap(targets, logged), [targets, logged]);
  const suggestions = useMemo(() => recommend(report, allFoods, { diet: profile.diet, avoid: profile.avoid }), [report, allFoods, profile.diet, profile.avoid]);
  const hydration = hydrationStatus(day.waterMl, targets.waterMl, creatine, hour);

  const recent = useMemo(() => {
    const all = Object.entries(store.days).sort(([a], [b]) => b.localeCompare(a)).flatMap(([, d]) => [...d.entries].reverse());
    return [...new Set(all.map((e) => e.foodId))].filter((id) => byId[id]).slice(0, 6);
  }, [store.days, byId]);

  const usage = useMemo(() => {
    const u: Record<string, number> = {};
    for (const d of Object.values(store.days)) for (const e of d.entries) u[e.foodId] = (u[e.foodId] ?? 0) + 1;
    return u;
  }, [store.days]);

  const { week, run } = useMemo(() => {
    const hits = new Set<string>();
    for (const [d, log] of Object.entries(store.days)) {
      if (dayHit(dayTotals(log, byId), log.targetsSnapshot ?? currentTargets)) hits.add(d);
    }
    const pts: WeekPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = shiftIso(today, -i);
      const log = store.days[d];
      const t = log?.targetsSnapshot ?? currentTargets;
      const tot = log ? dayTotals(log, byId) : null;
      pts.push({
        label: new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "short" }),
        kcalPct: tot ? Math.min(150, Math.round((tot.kcal / t.kcal) * 100)) : 0,
        proteinPct: tot ? Math.min(150, Math.round((tot.proteinG / t.proteinG) * 100)) : 0,
        logged: !!tot && (log.entries.length > 0 || Object.values(log.supplements).some(Boolean)),
      });
    }
    return { week: pts, run: streak(hits, today) };
  }, [store.days, currentTargets, today, byId]);

  /* body & mind */
  const trend = useMemo(() => weightTrend(store.days, today, profile.surplus), [store.days, today, profile.surplus]);
  const weightSeries = useMemo(() => {
    const out: { label: string; kg: number }[] = [];
    for (let i = 27; i >= 0; i--) {
      const d = shiftIso(today, -i);
      const kg = store.days[d]?.weightKg;
      if (typeof kg === "number") out.push({ label: d.slice(5), kg });
    }
    return out;
  }, [store.days, today]);

  /* reminders */
  const push = usePushState(store.mode);
  useInPageReminders({
    active: store.reminders.enabled && !push.pushActive && push.permission === "granted",
    prefs: store.reminders, profile, getDay: store.getDay, customFoods: store.customFoods,
  });
  const preview = useMemo(() => {
    if (tab !== "reminders") return [];
    return planReminders({
      now: new Date(), profile, day: store.getDay(today), customFoods: store.customFoods, lastSent: {},
      prefs: { ...store.reminders, enabled: true, quietStart: "00:00", quietEnd: "00:00", closeoutTime: "00:00" },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, store.reminders, store.customFoods, store.days, profile, tick]);

  const dateLabel = new Date(iso + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const logSuggestion = (s: Suggestion) => {
    store.addEntries(iso, s.items.map((i) => ({ foodId: i.foodId, grams: i.grams })), isToday ? nowHHMM() : "21:00");
    setToast(`Logged ${s.items.map((i) => `${i.grams} g ${i.name.toLowerCase()}`).join(" and ")}.`);
  };

  const deleteFood = (f: Food) => {
    if (usage[f.id]) { setToast(`${f.name} is in ${usage[f.id]} logged ${usage[f.id] === 1 ? "entry" : "entries"}. Edit it instead of deleting.`); return; }
    if (confirm(`Delete ${f.name}?`)) { store.removeFood(f.id); setToast(`Deleted ${f.name}.`); }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 py-2">
        <p className="font-display text-2xl font-extrabold tracking-tight">NutriGain</p>
        <div className="flex items-center gap-1">
          <button className="rounded-full p-2 hover:bg-surface" aria-label="Previous day" onClick={() => setIso(shiftIso(iso, -1))}><ChevronLeft size={20} /></button>
          <span className="min-w-44 text-center font-semibold">{isToday ? "Today" : dateLabel}</span>
          <button className="rounded-full p-2 hover:bg-surface disabled:opacity-30" aria-label="Next day" disabled={isToday} onClick={() => setIso(shiftIso(iso, 1))}><ChevronRight size={20} /></button>
          {!isToday && <button className="btn-ghost ml-1" onClick={() => setIso(today)}>Back to today</button>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-sm ${store.sync === "error" ? "font-semibold text-over" : "text-ink2"}`} role="status">
            {store.mode === "local" ? "Saved on this device"
              : store.sync === "saving" ? "Saving…"
              : store.sync === "error" ? "Not saved. Retrying…"
              : "Saved to your account"}
          </p>
          <InstallButton />
          <ThemeToggle />
          <button className="btn-ghost" onClick={() => setEditing((e) => !e)} aria-expanded={editing}><SlidersHorizontal size={14} aria-hidden /> Profile</button>
          {store.mode === "cloud" ? (
            <button className="btn-ghost" onClick={() => store.logout()} title={store.email ?? undefined}><LogOut size={14} aria-hidden /> Sign out</button>
          ) : (
            <button className="btn-ghost" onClick={() => store.chooseAccount()}><LogIn size={14} aria-hidden /> Sign in to sync</button>
          )}
          <button className="btn-ghost" aria-label="Erase all data and start over"
            onClick={() => { if (confirm(store.mode === "cloud" ? "Erase your profile and every log saved to this account?" : "Erase your profile and all logs on this device?")) store.reset(); }}>
            <RotateCcw size={14} aria-hidden />
          </button>
        </div>
      </header>

      {editing && (
        <div className="panel mt-4 p-5 sm:p-6">
          <h2 className="mb-4 font-display text-xl font-bold">Edit profile</h2>
          <ProfileForm initial={profile} submitLabel="Save and recalculate" onCancel={() => setEditing(false)}
            onSave={(p) => { store.saveProfile(p); setEditing(false); setToast("Targets recalculated."); }} />
        </div>
      )}

      <nav aria-label="Sections" className="mt-3">
        <div role="tablist" className="flex gap-1 overflow-x-auto rounded-full border border-line bg-panel p-1">
          {TABS.map(([k, label]) => (
            <button key={k} role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls={`panel-${k}`} onClick={() => setTab(k)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${tab === k ? "bg-ink text-paper" : "text-ink2 hover:bg-paper"}`}>{label}</button>
          ))}
        </div>
      </nav>

      <main className="mt-4">
        {tab === "today" && (
          <div role="tabpanel" id="panel-today" aria-labelledby="tab-today" className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <section className="panel flex flex-col p-5 sm:p-6 lg:col-span-7" aria-labelledby="today-h">
              <h1 id="today-h" className="font-display text-2xl font-bold">{isToday ? dateLabel : `${dateLabel} (past day)`}</h1>
              <p className="mb-5 mt-1 text-ink2 tabular-nums">
                Gain target {targets.kcal} kcal: {targets.tdee} maintenance + {targets.surplusKcal}. Protein {targets.proteinG} g.
              </p>
              <div className="my-auto"><Rings logged={logged} targets={targets} /></div>
            </section>

            <div className="lg:col-span-5">
              <ScaleLog recent={recent} defaultTime={isToday ? nowHHMM() : "12:00"} key={iso} foods={allFoods} byId={byId}
                selectId={selectId} onAddFood={() => setFoodEditor({})}
                onAdd={(foodId, grams, time) => { store.addEntries(iso, [{ foodId, grams }], time); setToast(`Logged ${grams} g ${byId[foodId].name.toLowerCase()}.`); }} />
            </div>

            <div className="lg:col-span-12">
              <GapPanel report={report} suggestions={suggestions} evening={hour >= 18} diet={profile.diet}
                onDiet={(diet) => store.saveProfile({ ...profile, diet })} onLog={logSuggestion} />
            </div>

            <div className="lg:col-span-7"><MealList day={day} byId={byId} onRemove={(id) => store.removeEntry(iso, id)} /></div>
            <div className="grid content-start gap-4 lg:col-span-5">
              <WaterTube ml={day.waterMl} target={targets.waterMl} status={hydration} creatine={creatine} onAdd={(ml) => store.addWater(iso, ml)} />
              <Supplements day={day} onChange={(id, d) => store.changeDose(iso, id, d)} />
            </div>

            <div className="lg:col-span-12"><WeekChart data={week} streak={run} /></div>
          </div>
        )}

        {tab === "body" && (
          <div role="tabpanel" id="panel-body" aria-labelledby="tab-body" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CheckInCard day={day} update={(fn) => store.updateDay(iso, fn)} />
            <TrainingCard day={day} update={(fn) => store.updateDay(iso, fn)} proteinPct={report.pct.proteinG} />
            <WeightCard key={iso} day={day} update={(fn) => store.updateDay(iso, fn)} trend={trend} series={weightSeries} current={profile.weightKg}
              onSuggest={(m) => { store.saveProfile({ ...profile, surplus: m }); setToast(`Switched to the ${m} pace. Targets recalculated.`); }}
              onApplyWeight={(kg) => { store.saveProfile({ ...profile, weightKg: kg }); setToast("Profile weight updated. Targets recalculated."); }} />
            <Breathe minutesToday={day.mindfulMin ?? 0} onDone={(m) => { store.updateDay(iso, (d) => ({ ...d, mindfulMin: (d.mindfulMin ?? 0) + m })); setToast(`Nice. ${m} mindful minute${m === 1 ? "" : "s"} logged.`); }} />
            <HabitsCard day={day} update={(fn) => store.updateDay(iso, fn)} />
            <WeekInsights days={store.days} todayIso={today} />
          </div>
        )}

        {tab === "foods" && (
          <div role="tabpanel" id="panel-foods" aria-labelledby="tab-foods">
            <MyFoods foods={store.customFoods} usage={usage} onAdd={() => setFoodEditor({})} onEdit={(f) => setFoodEditor({ food: f })} onDelete={deleteFood} />
          </div>
        )}

        {tab === "reminders" && (
          <div role="tabpanel" id="panel-reminders" aria-labelledby="tab-reminders">
            <RemindersPanel prefs={store.reminders} onChange={store.setReminders} signedIn={store.mode === "cloud"} push={push} preview={preview} />
          </div>
        )}
      </main>

      {foodEditor && (
        <FoodForm initial={foodEditor.food} onClose={() => setFoodEditor(null)}
          onSave={(f) => { store.saveFood(f); setFoodEditor(null); setSelectId(f.id); setToast(`Saved ${f.name}.`); }} />
      )}

      <p role="status" aria-live="polite" className={`fixed inset-x-4 bottom-4 mx-auto max-w-md rounded-full bg-ink px-5 py-3 text-center text-sm text-paper shadow-lg transition-opacity ${toast ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        {toast}
      </p>
    </div>
  );
}
