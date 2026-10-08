"use client";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HABITS, WORKOUT_TYPES, sleepInsight, weekSummary, type WeightTrend } from "@/lib/wellness";
import type { CheckIn, DayLog, SurplusMode } from "@/lib/types";

type Patch = (fn: (d: DayLog) => DayLog) => void;

function Scale({ label, low, high, value, onPick }: { label: string; low: string; high: string; value?: number; onPick: (v: number) => void }) {
  return (
    <div className="py-3">
      <p className="font-semibold" id={`sc-${label}`}>{label}</p>
      <div role="radiogroup" aria-labelledby={`sc-${label}`} className="mt-2 grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} role="radio" aria-checked={value === n} onClick={() => onPick(n)}
            className={`h-10 rounded-xl border text-base font-semibold ${value === n ? "border-ink bg-ink text-paper" : "border-line bg-surface hover:bg-paper"}`}>{n}</button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-ink2"><span>{low}</span><span>{high}</span></div>
    </div>
  );
}

export function CheckInCard({ day, update }: { day: DayLog; update: Patch }) {
  const c: CheckIn = day.checkin ?? {};
  const set = (patch: Partial<CheckIn>) => update((d) => ({ ...d, checkin: { ...d.checkin, ...patch } }));
  const sleep = c.sleepH;
  return (
    <section className="panel p-5 sm:p-6" aria-labelledby="ci-h">
      <h2 id="ci-h" className="font-display text-xl font-bold">How you feel today</h2>
      <p className="text-ink2">Takes ten seconds. After a week it shows what helps you.</p>
      <div className="mt-3 divide-y divide-line">
        <div className="flex items-center justify-between gap-3 py-3">
          <div><p className="font-semibold">Sleep last night</p><p className="text-sm text-ink2">Most adults do best with 7 to 9 hours.</p></div>
          <div className="flex items-center gap-1">
            <button className="btn-ghost !px-2.5" aria-label="Half an hour less" onClick={() => set({ sleepH: Math.max(0, (sleep ?? 7) - 0.5) })}><Minus size={14} /></button>
            <span className="min-w-16 text-center font-display text-xl font-bold tabular-nums">{sleep != null ? `${sleep} h` : "—"}</span>
            <button className="btn-ink !px-2.5" aria-label="Half an hour more" onClick={() => set({ sleepH: Math.min(14, (sleep ?? 6.5) + 0.5) })}><Plus size={14} /></button>
          </div>
        </div>
        <Scale label="Mood" low="Low" high="Great" value={c.mood} onPick={(v) => set({ mood: v })} />
        <Scale label="Energy" low="Drained" high="Charged" value={c.energy} onPick={(v) => set({ energy: v })} />
        <Scale label="Stress" low="Calm" high="Stressed" value={c.stress} onPick={(v) => set({ stress: v })} />
      </div>
      <p className="mt-3 text-sm text-ink2">If low mood or stress lasts for weeks, it is worth talking to a doctor or counselor. This log is not a diagnosis.</p>
    </section>
  );
}

export function TrainingCard({ day, update, proteinPct }: { day: DayLog; update: Patch; proteinPct: number }) {
  const w = day.workout;
  const types = [...WORKOUT_TYPES, "Rest day"];
  const pick = (type: string) => update((d) => ({ ...d, workout: type === "Rest day" ? { type, minutes: 0, rpe: 1 } : { type, minutes: d.workout?.minutes || 45, rpe: d.workout?.rpe && d.workout.type !== "Rest day" ? d.workout.rpe : 7 } }));
  const tip =
    !w ? "Log what you did, or mark a rest day. Rest days count: muscle is built while you recover."
    : w.type === "Rest day" ? "Rest day. Keep protein up and get your sleep; this is when muscle repairs."
    : proteinPct < 0.9 ? `Protein is at ${Math.round(proteinPct * 100)}% of target. A protein serving in the next few hours supports recovery.`
    : "Protein is on target. Water and sleep are the next recovery levers.";
  return (
    <section className="panel p-5 sm:p-6" aria-labelledby="tr-h">
      <h2 id="tr-h" className="font-display text-xl font-bold">Training</h2>
      <div role="radiogroup" aria-label="Workout type" className="mt-3 flex flex-wrap gap-2">
        {types.map((t) => (
          <button key={t} role="radio" aria-checked={w?.type === t} onClick={() => pick(t)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${w?.type === t ? "border-ink bg-ink text-paper" : "border-line bg-surface hover:bg-paper"}`}>{t}</button>
        ))}
      </div>
      {w && w.type !== "Rest day" && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm text-ink2">Minutes
            <input className="field" type="number" min={5} max={600} value={w.minutes} onChange={(e) => update((d) => ({ ...d, workout: { ...w, minutes: Math.max(0, Math.min(600, Number(e.target.value) || 0)) } }))} />
          </label>
          <label className="grid gap-1 text-sm text-ink2">How hard (1 easy to 10 max)
            <select className="field" value={w.rpe} onChange={(e) => update((d) => ({ ...d, workout: { ...w, rpe: Number(e.target.value) } }))}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
      )}
      <p className="mt-4 rounded-xl bg-surface px-3 py-2 text-sm">{tip}</p>
    </section>
  );
}

export function WeightCard({ day, update, trend, series, onSuggest, current, onApplyWeight }: {
  day: DayLog; update: Patch; trend: WeightTrend | null; series: { label: string; kg: number }[]; onSuggest: (m: SurplusMode) => void; current: number; onApplyWeight: (kg: number) => void;
}) {
  const [val, setVal] = useState(day.weightKg != null ? String(day.weightKg) : "");
  const kg = Number(val);
  const ok = Number.isFinite(kg) && kg >= 30 && kg <= 250;
  return (
    <section className="panel p-5 sm:p-6" aria-labelledby="wt-h">
      <h2 id="wt-h" className="font-display text-xl font-bold">Body weight</h2>
      <p className="text-ink2">Weigh in the same way each morning. The trend matters, not one day.</p>
      <form className="mt-3 flex items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (ok) update((d) => ({ ...d, weightKg: Math.round(kg * 10) / 10 })); }}>
        <label className="grid gap-1 text-sm text-ink2">Today (kg)
          <input className="field !w-32" inputMode="decimal" value={val} placeholder={String(current)} onChange={(e) => setVal(e.target.value.replace(/[^0-9.]/g, ""))} />
        </label>
        <button className="btn-ink" disabled={!ok}>{day.weightKg != null ? "Update" : "Save weigh-in"}</button>
      </form>
      {day.weightKg != null && Math.abs(day.weightKg - current) >= 1 && (
        <p className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-surface px-3 py-2 text-sm">
          Your profile says {current} kg. Update it to {day.weightKg} kg so your protein and calorie targets stay accurate?
          <button className="btn-ink" onClick={() => onApplyWeight(day.weightKg!)}>Update profile</button>
        </p>
      )}
      {series.length >= 2 && (
        <div className="mt-4 h-36" role="img" aria-label="Line chart of body weight over the last four weeks">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgb(var(--line))" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "rgb(var(--ink2))", fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis domain={["dataMin - 0.5", "dataMax + 0.5"]} tickLine={false} axisLine={false} tick={{ fill: "rgb(var(--ink2))", fontSize: 11 }} />
              <Tooltip formatter={(v) => `${v} kg`} contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--line))", borderRadius: 12, color: "rgb(var(--ink))" }} labelStyle={{ color: "rgb(var(--ink))" }} itemStyle={{ color: "rgb(var(--ink))" }} />
              <Line type="monotone" dataKey="kg" stroke="rgb(var(--protein))" strokeWidth={2.5} dot={{ r: 3, fill: "rgb(var(--protein))" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {trend ? (
        <div className="mt-3 rounded-xl bg-surface p-4">
          <p className="font-display text-2xl font-bold tabular-nums">{trend.slopeKgPerWeek >= 0 ? "+" : ""}{trend.slopeKgPerWeek.toFixed(2)} kg / week <span className="text-base font-normal text-ink2">({trend.pctPerWeek.toFixed(2)}% of body weight)</span></p>
          <p className="mt-1">{trend.advice}</p>
          {trend.suggest && <button className="btn-ghost mt-3" onClick={() => onSuggest(trend.suggest!)}>Switch to {trend.suggest} pace</button>}
          <p className="mt-2 text-xs text-ink2">General guidance for lean gain, not medical advice.</p>
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-surface p-4 text-ink2">Log your weight on at least three days spread over a week and NutriGain will tell you if you are gaining at a healthy pace.</p>
      )}
    </section>
  );
}

export function HabitsCard({ day, update }: { day: DayLog; update: Patch }) {
  const done = HABITS.filter((h) => day.habits?.[h.id]).length;
  return (
    <section className="panel p-5 sm:p-6" aria-labelledby="hb-h">
      <div className="flex items-baseline justify-between"><h2 id="hb-h" className="font-display text-xl font-bold">Daily habits</h2><p className="text-ink2 tabular-nums">{done} of {HABITS.length}</p></div>
      <ul className="mt-2 divide-y divide-line">
        {HABITS.map((h) => (
          <li key={h.id}>
            <label className="flex items-center gap-3 py-3">
              <input type="checkbox" className="h-5 w-5 accent-protein" checked={!!day.habits?.[h.id]} onChange={(e) => update((d) => ({ ...d, habits: { ...d.habits, [h.id]: e.target.checked } }))} />
              {h.label}
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WeekInsights({ days, todayIso }: { days: Record<string, DayLog>; todayIso: string }) {
  const s = weekSummary(days, todayIso);
  const insight = sleepInsight(days, todayIso);
  const tiles: [string, string][] = [
    ["Workouts", String(s.sessions)], ["Avg sleep", s.avgSleep != null ? `${s.avgSleep.toFixed(1)} h` : "—"],
    ["Avg mood", s.avgMood != null ? `${s.avgMood.toFixed(1)}/5` : "—"], ["Avg energy", s.avgEnergy != null ? `${s.avgEnergy.toFixed(1)}/5` : "—"],
    ["Mindful minutes", String(s.mindfulMin)], ["Habits done", s.habitPct != null ? `${s.habitPct}%` : "—"],
  ];
  return (
    <section className="panel p-5 sm:p-6" aria-labelledby="wk-h">
      <h2 id="wk-h" className="font-display text-xl font-bold">Your week</h2>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map(([k, v]) => <li key={k} className="rounded-xl bg-surface px-3 py-2"><span className="block text-sm text-ink2">{k}</span><span className="font-display text-xl font-bold tabular-nums">{v}</span></li>)}
      </ul>
      <p className="mt-4">{insight ?? "Log sleep and energy on a few days of each kind (7+ hours and under 7) and a pattern will show up here."}</p>
    </section>
  );
}
