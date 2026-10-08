import type { DayLog, Food, Profile, ReminderPrefs, Targets } from "@/lib/types";
import { AVOID_OPTIONS } from "@/lib/foodTags";

const num = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null;
const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | null => (list as readonly unknown[]).includes(v) ? (v as T) : null;

export const isIsoDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T12:00:00"));

export function sanitizeProfile(p: any): Profile | null {
  if (!p || typeof p !== "object") return null;
  const sex = oneOf(p.sex, ["male", "female"] as const);
  const activity = oneOf(p.activity, ["sedentary", "light", "moderate", "very_active", "extra_active"] as const);
  const surplus = oneOf(p.surplus, ["lean", "standard", "aggressive"] as const);
  const diet = oneOf(p.diet, ["omnivore", "vegetarian", "vegan"] as const);
  const age = num(p.age, 14, 90), heightCm = num(p.heightCm, 120, 230), weightKg = num(p.weightKg, 30, 250);
  if (!sex || !activity || !surplus || !diet || age === null || heightCm === null || weightKg === null) return null;
  const avoid = Array.isArray(p.avoid) ? p.avoid.filter((a: unknown) => AVOID_OPTIONS.some((o) => o.id === a)) : [];
  return { name: String(p.name ?? "").slice(0, 60), sex, age, heightCm, weightKg, activity, surplus, diet, creatine: p.creatine !== false, avoid };
}

const TARGET_KEYS = ["kcal", "proteinG", "carbsG", "fatG", "fiberG", "calciumMg", "ironMg", "potassiumMg", "bmr", "tdee", "waterMl", "surplusKcal"] as const;

export function sanitizeDay(d: any): DayLog | null {
  if (!d || typeof d !== "object" || !Array.isArray(d.entries)) return null;
  const waterMl = num(d.waterMl ?? 0, 0, 20000);
  if (waterMl === null || d.entries.length > 300) return null;
  const entries: DayLog["entries"] = [];
  for (const e of d.entries) {
    const grams = num(e?.grams, 0.1, 2000);
    if (grams === null || typeof e.id !== "string" || typeof e.foodId !== "string" || e.id.length > 40 || e.foodId.length > 64 || !/^\d{2}:\d{2}$/.test(e.time)) return null;
    entries.push({ id: e.id, foodId: e.foodId, grams, time: e.time });
  }
  const supplements: Record<string, number> = {};
  if (d.supplements && typeof d.supplements === "object") {
    for (const [k, v] of Object.entries(d.supplements).slice(0, 20)) {
      const n = num(v, 0, 50);
      if (n !== null && k.length <= 40) supplements[k] = n;
    }
  }
  let targetsSnapshot: Targets | undefined;
  if (d.targetsSnapshot && typeof d.targetsSnapshot === "object") {
    const t: Record<string, number> = {};
    for (const k of TARGET_KEYS) { const n = num(d.targetsSnapshot[k], 0, 100000); if (n === null) { t.__bad = 1; break; } t[k] = n; }
    if (!t.__bad) targetsSnapshot = t as unknown as Targets;
  }
  const out: DayLog = { entries, waterMl, supplements, ...(targetsSnapshot ? { targetsSnapshot } : {}) };
  const c = d.checkin;
  if (c && typeof c === "object") {
    const checkin: NonNullable<DayLog["checkin"]> = {};
    const sleep = num(c.sleepH, 0, 24); if (sleep !== null) checkin.sleepH = sleep;
    for (const k of ["mood", "energy", "stress"] as const) { const n = num(c[k], 1, 5); if (n !== null && Number.isInteger(n)) checkin[k] = n; }
    if (Object.keys(checkin).length) out.checkin = checkin;
  }
  const w = d.workout;
  if (w && typeof w === "object" && typeof w.type === "string" && w.type.length <= 30) {
    const minutes = num(w.minutes, 0, 600), rpe = num(w.rpe, 1, 10);
    if (minutes !== null && rpe !== null) out.workout = { type: w.type, minutes, rpe };
  }
  const wk = num(d.weightKg, 30, 250); if (wk !== null) out.weightKg = wk;
  const mm = num(d.mindfulMin, 0, 600); if (mm !== null && mm > 0) out.mindfulMin = mm;
  if (d.habits && typeof d.habits === "object") {
    const habits: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(d.habits).slice(0, 20)) if (k.length <= 40 && typeof v === "boolean") habits[k] = v;
    if (Object.keys(habits).length) out.habits = habits;
  }
  return out;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function sanitizeFood(f: any): Food | null {
  if (!f || typeof f !== "object") return null;
  const name = String(f.name ?? "").trim();
  if (!name || name.length > 60 || typeof f.id !== "string" || !/^c_[a-z0-9]{4,40}$/.test(f.id)) return null;
  const kcal = num(f.kcal, 0, 900), proteinG = num(f.proteinG, 0, 100), carbsG = num(f.carbsG, 0, 100), fatG = num(f.fatG, 0, 100);
  const fiberG = num(f.fiberG ?? 0, 0, 100), calciumMg = num(f.calciumMg ?? 0, 0, 3000), ironMg = num(f.ironMg ?? 0, 0, 100), potassiumMg = num(f.potassiumMg ?? 0, 0, 6000);
  const servingG = num(f.servingG ?? 100, 1, 2000), minG = num(f.minG ?? 50, 1, 2000), maxG = num(f.maxG ?? 300, 1, 2000);
  const diet = oneOf(f.diet, ["v", "vg", "o"] as const);
  if ([kcal, proteinG, carbsG, fatG, fiberG, calciumMg, ironMg, potassiumMg, servingG, minG, maxG].some((x) => x === null) || !diet) return null;
  if (proteinG! + carbsG! + fatG! > 100.5 || maxG! < minG!) return null; // per 100 g, macros cannot exceed the food's weight
  const contains = Array.isArray(f.contains) ? f.contains.filter((a: unknown) => AVOID_OPTIONS.some((o) => o.id === a)) : [];
  return {
    id: f.id, name, category: "custom", custom: true, diet, contains,
    kcal: kcal!, proteinG: proteinG!, carbsG: carbsG!, fatG: fatG!, fiberG: fiberG!, calciumMg: calciumMg!, ironMg: ironMg!, potassiumMg: potassiumMg!,
    servingG: servingG!, servingLabel: String(f.servingLabel ?? "").slice(0, 40) || `${servingG} g`, minG: minG!, maxG: maxG!,
  };
}

export function sanitizeFoods(list: any): Food[] | null {
  if (!Array.isArray(list) || list.length > 500) return null;
  const out: Food[] = [];
  for (const f of list) { const s = sanitizeFood(f); if (!s) return null; out.push(s); }
  return out;
}

export function sanitizeReminders(r: any): ReminderPrefs | null {
  if (!r || typeof r !== "object") return null;
  const waterEveryMin = num(r.waterEveryMin, 30, 360), foodEveryHours = num(r.foodEveryHours, 2, 8);
  if (waterEveryMin === null || foodEveryHours === null) return null;
  for (const k of ["closeoutTime", "quietStart", "quietEnd"]) if (typeof r[k] !== "string" || !HHMM.test(r[k])) return null;
  let tz = "UTC";
  if (typeof r.tz === "string" && r.tz.length <= 64) { try { new Intl.DateTimeFormat("en-CA", { timeZone: r.tz }); tz = r.tz; } catch { /* keep UTC */ } }
  return { enabled: r.enabled === true, water: r.water !== false, food: r.food !== false, closeout: r.closeout !== false, waterEveryMin, foodEveryHours, closeoutTime: r.closeoutTime, quietStart: r.quietStart, quietEnd: r.quietEnd, tz };
}
