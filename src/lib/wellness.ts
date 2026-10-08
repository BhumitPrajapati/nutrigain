import type { DayLog, SurplusMode } from "./types";
import { shiftIsoPure } from "./dates";

export const WORKOUT_TYPES = ["Strength", "Cardio", "Mobility or yoga", "Sport", "Walk"] as const;

export const HABITS: { id: string; label: string }[] = [
  { id: "walk", label: "10 minutes outside in daylight" },
  { id: "mobility", label: "5 minutes of stretching or mobility" },
  { id: "screens", label: "Screens off 30 minutes before bed" },
  { id: "breakfast", label: "Protein at breakfast" },
  { id: "gratitude", label: "Wrote down one good thing from today" },
];

export interface WeightTrend {
  latestKg: number;
  slopeKgPerWeek: number;
  pctPerWeek: number;
  points: number;
  tone: "slow" | "ok" | "fast";
  advice: string;
  suggest?: SurplusMode;
}

const MODES: SurplusMode[] = ["lean", "standard", "aggressive"];

/** Least-squares slope over the last 28 days of weigh-ins. Needs 3+ weigh-ins that span at least 7 days. */
export function weightTrend(days: Record<string, DayLog>, todayIso: string, mode: SurplusMode): WeightTrend | null {
  const pts: { x: number; y: number }[] = [];
  for (let i = 27; i >= 0; i--) {
    const w = days[shiftIsoPure(todayIso, -i)]?.weightKg;
    if (typeof w === "number") pts.push({ x: 27 - i, y: w });
  }
  if (pts.length < 3 || pts[pts.length - 1].x - pts[0].x < 7) return null;
  const n = pts.length;
  const mx = pts.reduce((a, p) => a + p.x, 0) / n, my = pts.reduce((a, p) => a + p.y, 0) / n;
  const slopePerDay = pts.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0) / pts.reduce((a, p) => a + (p.x - mx) ** 2, 0);
  const slopeKgPerWeek = slopePerDay * 7;
  const pctPerWeek = (slopeKgPerWeek / my) * 100;
  const idx = MODES.indexOf(mode);
  let tone: WeightTrend["tone"] = "ok", advice = "", suggest: SurplusMode | undefined;
  if (pctPerWeek < 0.1) {
    tone = "slow";
    advice = "Your weight is barely moving. If muscle gain is the goal, a larger surplus usually helps.";
    if (idx < 2) suggest = MODES[idx + 1];
  } else if (pctPerWeek < 0.25) {
    tone = "slow";
    advice = "A little below the 0.25 to 0.5% a week that lean-gain guidance usually targets. Fine if you are happy with the pace.";
  } else if (pctPerWeek <= 0.5) {
    advice = "Right in the usual 0.25 to 0.5% a week range for lean gain. Keep going.";
  } else if (pctPerWeek <= 0.7) {
    tone = "fast";
    advice = "Slightly faster than the usual lean-gain range. Watch your waist measurement.";
  } else {
    tone = "fast";
    advice = "Gaining quickly, which tends to add more fat than muscle. A smaller surplus may suit you better.";
    if (idx > 0) suggest = MODES[idx - 1];
  }
  return { latestKg: pts[n - 1].y, slopeKgPerWeek, pctPerWeek, points: n, tone, advice, suggest };
}

export interface WeekSummary {
  sessions: number; avgSleep: number | null; avgMood: number | null; avgEnergy: number | null; mindfulMin: number; habitPct: number | null; daysWithData: number;
}

export function weekSummary(days: Record<string, DayLog>, todayIso: string): WeekSummary {
  let sessions = 0, mindful = 0, sleep: number[] = [], mood: number[] = [], energy: number[] = [], habitDone = 0, habitDays = 0, withData = 0;
  for (let i = 0; i < 7; i++) {
    const d = days[shiftIsoPure(todayIso, -i)];
    if (!d) continue;
    if (d.workout && d.workout.type !== "Rest day") sessions++;
    mindful += d.mindfulMin ?? 0;
    if (d.checkin?.sleepH != null) sleep.push(d.checkin.sleepH);
    if (d.checkin?.mood != null) mood.push(d.checkin.mood);
    if (d.checkin?.energy != null) energy.push(d.checkin.energy);
    if (d.habits) { habitDays++; habitDone += Object.values(d.habits).filter(Boolean).length; }
    if (d.checkin || d.workout || d.habits || d.mindfulMin) withData++;
  }
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  return { sessions, avgSleep: avg(sleep), avgMood: avg(mood), avgEnergy: avg(energy), mindfulMin: mindful, habitPct: habitDays ? Math.round((habitDone / (habitDays * HABITS.length)) * 100) : null, daysWithData: withData };
}

/** Compares energy and mood on days after 7+ hours of sleep with days after less. Needs 3 days in each group. */
export function sleepInsight(days: Record<string, DayLog>, todayIso: string): string | null {
  const long: DayLog[] = [], short: DayLog[] = [];
  for (let i = 0; i < 28; i++) {
    const d = days[shiftIsoPure(todayIso, -i)];
    if (d?.checkin?.sleepH != null && (d.checkin.energy != null || d.checkin.mood != null)) (d.checkin.sleepH >= 7 ? long : short).push(d);
  }
  if (long.length < 3 || short.length < 3) return null;
  const avg = (ds: DayLog[], k: "energy" | "mood") => { const v = ds.map((d) => d.checkin?.[k]).filter((x): x is number => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const eL = avg(long, "energy"), eS = avg(short, "energy");
  if (eL == null || eS == null) return null;
  const diff = eL - eS;
  if (Math.abs(diff) < 0.3) return "Your energy looks about the same whether you sleep 7 hours or less so far.";
  return `On days with 7+ hours of sleep your energy averaged ${eL.toFixed(1)}/5, versus ${eS.toFixed(1)}/5 on shorter nights. This is a pattern in your own logs, not proof.`;
}
