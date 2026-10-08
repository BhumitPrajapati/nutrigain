import type {
  Activity, DayLog, DietPref, Food, GapReport, Nutrients, Profile, Suggestion, SurplusMode, Targets,
} from "./types";
import { RECIPE_HINTS } from "@/data/foods";
import { SUPPLEMENTS } from "@/data/supplements";
import { foodContains } from "./foodTags";

/* ------------------------------------------------------------------ *
 * 1. Targets: Mifflin-St Jeor -> TDEE -> hypertrophy surplus -> macros
 * ------------------------------------------------------------------ */

export const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, very_active: 1.725, extra_active: 1.9,
};
export const SURPLUS_KCAL: Record<SurplusMode, number> = { lean: 300, standard: 400, aggressive: 500 };

export const NUTRIENT_KEYS = ["kcal", "proteinG", "carbsG", "fatG", "fiberG", "calciumMg", "ironMg", "potassiumMg"] as const;
export const MICRO_KEYS = ["fiberG", "calciumMg", "ironMg", "potassiumMg"] as const;

const round = (n: number, step = 1) => Math.round(n / step) * step;

export function calcBmr(p: Pick<Profile, "sex" | "weightKg" | "heightCm" | "age">): number {
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === "male" ? 5 : -161);
}

export function calcTdee(p: Profile): number {
  return calcBmr(p) * ACTIVITY_FACTOR[p.activity];
}

export function hydrationTarget(weightKg: number, takesCreatine: boolean): number {
  return round(weightKg * 35 + (takesCreatine ? 500 : 0), 50);
}

export function computeTargets(p: Profile, takesCreatine = true): Targets {
  const bmr = calcBmr(p);
  const tdee = bmr * ACTIVITY_FACTOR[p.activity];
  const surplusKcal = SURPLUS_KCAL[p.surplus];
  const kcal = round(tdee + surplusKcal, 5);
  const proteinG = round(p.weightKg * 2.0);
  // Fat: 25% of calories, never below 0.8 g/kg (hormone health). Carbs take the rest.
  const fatG = round(Math.max((kcal * 0.25) / 9, p.weightKg * 0.8));
  const carbsG = round((kcal - proteinG * 4 - fatG * 9) / 4);
  return {
    bmr: round(bmr), tdee: round(tdee), surplusKcal, kcal, proteinG, carbsG, fatG,
    fiberG: round((kcal / 1000) * 14),
    calciumMg: 1000,
    ironMg: p.sex === "male" ? 8 : 18,
    potassiumMg: p.sex === "male" ? 3400 : 2600,
    waterMl: hydrationTarget(p.weightKg, takesCreatine),
  };
}

/* ------------------------------------------------------------------ *
 * 2. Logged totals
 * ------------------------------------------------------------------ */

export const emptyNutrients = (): Nutrients => ({
  kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, calciumMg: 0, ironMg: 0, potassiumMg: 0,
});

export function nutrientsFor(food: Food, grams: number): Nutrients {
  const k = grams / 100;
  return {
    kcal: food.kcal * k, proteinG: food.proteinG * k, carbsG: food.carbsG * k, fatG: food.fatG * k,
    fiberG: food.fiberG * k, calciumMg: food.calciumMg * k, ironMg: food.ironMg * k, potassiumMg: food.potassiumMg * k,
  };
}

export function addNutrients(a: Nutrients, b: Partial<Nutrients>): Nutrients {
  const out = { ...a };
  for (const key of NUTRIENT_KEYS) out[key] += b[key] ?? 0;
  return out;
}

export function dayTotals(day: DayLog, foodById: Record<string, Food>): Nutrients {
  let total = emptyNutrients();
  for (const e of day.entries) {
    const food = foodById[e.foodId];
    if (food) total = addNutrients(total, nutrientsFor(food, e.grams));
  }
  for (const s of SUPPLEMENTS) {
    const doses = day.supplements[s.id] ?? 0;
    if (!doses) continue;
    if (s.foodId && foodById[s.foodId]) total = addNutrients(total, nutrientsFor(foodById[s.foodId], s.doseG * doses));
    if (s.micros) {
      const scaled: Partial<Nutrients> = {};
      for (const k of Object.keys(s.micros) as (keyof Nutrients)[]) scaled[k] = (s.micros[k] ?? 0) * doses;
      total = addNutrients(total, scaled);
    }
  }
  return total;
}

/* ------------------------------------------------------------------ *
 * 3. Gap analysis:  Missing = Target - Logged
 * ------------------------------------------------------------------ */

export function computeGap(targets: Targets, logged: Nutrients): GapReport {
  const remaining = emptyNutrients();
  const over = emptyNutrients();
  const pct = emptyNutrients();
  for (const k of NUTRIENT_KEYS) {
    const diff = targets[k] - logged[k];
    remaining[k] = Math.max(0, diff);
    over[k] = Math.max(0, -diff);
    pct[k] = targets[k] ? logged[k] / targets[k] : 0;
  }
  const missingMicros = MICRO_KEYS.filter((k) => pct[k] < 0.7);
  const status: GapReport["status"] =
    logged.kcal > targets.kcal * 1.1 ? "over"
    : pct.kcal >= 0.95 && pct.proteinG >= 0.95 ? "on-track"
    : "gap";
  return { status, remaining, over, pct, missingMicros };
}

/* ------------------------------------------------------------------ *
 * 4. Recommender: pick 1-2 foods whose portions fill the gap without
 *    overshooting calories or fat.
 * ------------------------------------------------------------------ */

export interface RecommendOptions {
  diet?: DietPref;
  /** ingredient tags to never suggest */
  avoid?: string[];
  count?: number;
  kcalTolerance?: number;  // kcal we may overshoot the remaining budget by
  fatTolerance?: number;   // g of fat we may overshoot by
  carbTolerance?: number;
}

export const isAllowed = (diet: DietPref, f: Food, avoid: string[] = []) =>
  (diet === "omnivore" ? true : diet === "vegetarian" ? f.diet !== "o" : f.diet === "v") &&
  !(avoid.length && foodContains(f).some((t) => avoid.includes(t)));

interface Opt { food: Food; grams: number; n: Nutrients }

export function portionsFor(food: Food): number[] {
  const discrete = food.servingG < 60 || food.category === "fruit";
  const out: number[] = [];
  if (discrete) {
    for (let g = food.servingG; g <= food.maxG + 0.001; g += food.servingG) out.push(g);
  } else {
    for (let g = food.minG; g <= food.maxG; g += 10) out.push(g);
  }
  return out;
}

export function recommend(
  report: GapReport,
  foods: Food[],
  { diet = "omnivore", avoid = [], count = 3, kcalTolerance = 80, fatTolerance = 3, carbTolerance = 25 }: RecommendOptions = {},
): Suggestion[] {
  const r = report.remaining;
  const noMacroGap = r.kcal < 60 && r.proteinG < 4;
  if (report.status === "over" || noMacroGap) return [];

  const kcalCap = r.kcal + kcalTolerance;
  const fatCap = r.fatG + fatTolerance;
  const carbCap = r.carbsG + carbTolerance;

  const opts: Opt[] = [];
  for (const food of foods) {
    if (!isAllowed(diet, food, avoid)) continue;
    // vegetables only earn a place when a micronutrient is actually low (nobody wants 300 g of spinach as filler)
    if (food.category === "veg" && report.missingMicros.length === 0) continue;
    for (const grams of portionsFor(food)) {
      const n = nutrientsFor(food, grams);
      if (n.kcal > kcalCap || n.fatG > fatCap || n.carbsG > carbCap) continue;
      opts.push({ food, grams, n });
    }
  }

  const microGaps = report.missingMicros;
  const loss = (s: Nutrients, items: number): number => {
    const pD = Math.max(r.proteinG, 15), kD = Math.max(r.kcal, 150), cD = Math.max(r.carbsG, 30), fD = Math.max(r.fatG, 10);
    let l =
      3.0 * (Math.max(0, r.proteinG - s.proteinG) / pD) +
      0.4 * (Math.max(0, s.proteinG - r.proteinG) / pD) +
      1.2 * (Math.max(0, r.kcal - s.kcal) / kD) +
      3.0 * (Math.max(0, s.kcal - r.kcal) / kD) +
      0.5 * (Math.max(0, r.carbsG - s.carbsG) / cD) +
      1.0 * (Math.max(0, s.carbsG - r.carbsG) / cD) +
      2.0 * (Math.max(0, s.fatG - r.fatG) / fD);
    if (microGaps.length) {
      let covered = 0;
      for (const m of microGaps) covered += Math.min(1, s[m] / Math.max(r[m], 1));
      l -= (0.25 * covered) / microGaps.length;
    }
    return l + 0.12 * (items - 1); // prefer a single food when it does the job
  };

  type Cand = { loss: number; picks: Opt[]; sum: Nutrients };
  const cands: Cand[] = [];
  for (let i = 0; i < opts.length; i++) {
    cands.push({ loss: loss(opts[i].n, 1), picks: [opts[i]], sum: opts[i].n });
    for (let j = i + 1; j < opts.length; j++) {
      const a = opts[i], b = opts[j];
      if (a.food.category === b.food.category) continue;
      const sum = addNutrients(a.n, b.n);
      if (sum.kcal > kcalCap || sum.fatG > fatCap || sum.carbsG > carbCap) continue;
      // pairs that make a real snack (see RECIPE_HINTS) rank ahead of arbitrary ingredient pairings
      const k = `${a.food.id}+${b.food.id}`;
      const known = RECIPE_HINTS[k] || RECIPE_HINTS[`${b.food.id}+${a.food.id}`];
      cands.push({ loss: loss(sum, 2) + (known ? 0 : 0.35), picks: [a, b], sum });
    }
  }
  cands.sort((x, y) => x.loss - y.loss);

  const chosen: Cand[] = [];
  const used = new Set<string>();
  for (const c of cands) {
    if (c.picks.some((p) => used.has(p.food.id))) continue;
    chosen.push(c);
    c.picks.forEach((p) => used.add(p.food.id));
    if (chosen.length >= count) break;
  }

  return chosen.map((c) => {
    const ids = c.picks.map((p) => p.food.id);
    const hint = c.picks.length === 2 ? (RECIPE_HINTS[ids.join("+")] ?? RECIPE_HINTS[[...ids].reverse().join("+")]) : undefined;
    const covP = Math.min(c.sum.proteinG, r.proteinG);
    const covK = Math.min(c.sum.kcal, r.kcal);
    return {
      items: c.picks.map((p) => ({
        foodId: p.food.id, name: p.food.name, grams: p.grams,
        label: p.food.servingG < 60 || p.food.category === "fruit"
          ? `${p.grams / p.food.servingG} × ${p.food.servingLabel}`
          : `${p.grams} g`,
      })),
      added: c.sum,
      score: Math.round(Math.max(0, 1 - c.loss / 3) * 100) / 100,
      hint,
      summary: r.proteinG >= 4
        ? `Fills ${Math.round(covP)} of ${Math.round(r.proteinG)} g protein and ${Math.round(covK)} of ${Math.round(r.kcal)} kcal`
        : `Protein is covered. Fills ${Math.round(covK)} of ${Math.round(r.kcal)} kcal`,
    };
  });
}

/* ------------------------------------------------------------------ *
 * 5. Hydration (stricter while taking creatine) and streaks
 * ------------------------------------------------------------------ */

export interface HydrationStatus { level: "ok" | "low" | "critical"; expectedMl: number; message: string }

/** `hour` is the local hour as a decimal, e.g. 14.5 = 2:30 pm. Waking day assumed 7:00-22:00. */
export function hydrationStatus(waterMl: number, targetMl: number, takesCreatine: boolean, hour: number): HydrationStatus {
  const frac = Math.min(1, Math.max(0, (hour - 7) / 15));
  const expectedMl = Math.round(targetMl * frac);
  const lowAt = takesCreatine ? 0.8 : 0.7;
  const critAt = takesCreatine ? 0.55 : 0.45;
  const behind = expectedMl - waterMl;
  let level: HydrationStatus["level"] = "ok";
  if (behind > 400 && waterMl < expectedMl * critAt) level = "critical";
  else if (behind > 250 && waterMl < expectedMl * lowAt) level = "low";
  const reason = takesCreatine ? "Creatine pulls water into muscle, so you need more than usual." : "";
  const message =
    level === "ok" ? ""
    : `${Math.round(behind)} mL behind pace. ${reason} Drink about ${Math.round(Math.min(behind, 750) / 50) * 50} mL now.`.replace("  ", " ");
  return { level, expectedMl, message };
}

export function dayHit(logged: Nutrients, t: Pick<Targets, "kcal" | "proteinG">): boolean {
  return logged.proteinG >= t.proteinG * 0.9 && logged.kcal >= t.kcal * 0.9 && logged.kcal <= t.kcal * 1.2;
}

/** Count consecutive hit days ending today (or yesterday if today isn't finished). */
export function streak(hitDates: Set<string>, todayIso: string): number {
  const d = new Date(todayIso + "T12:00:00");
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  if (!hitDates.has(iso(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (hitDates.has(iso(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* ------------------------------------------------------------------ *
 * 6. Nutrient-rich pick: the best everyday food for the lowest micronutrient
 * ------------------------------------------------------------------ */

export const MICRO_INFO: Record<(typeof MICRO_KEYS)[number], { label: string; unit: string }> = {
  fiberG: { label: "fiber", unit: "g" }, calciumMg: { label: "calcium", unit: "mg" },
  ironMg: { label: "iron", unit: "mg" }, potassiumMg: { label: "potassium", unit: "mg" },
};

export interface NutrientPick { food: Food; grams: number; micro: (typeof MICRO_KEYS)[number]; provided: number; remaining: number }

export function nutrientRichPick(
  report: GapReport, foods: Food[], { diet = "omnivore", avoid = [] }: { diet?: DietPref; avoid?: string[] } = {},
): NutrientPick | null {
  const micros = [...report.missingMicros].sort((a, b) => report.pct[a] - report.pct[b]);
  for (const m of micros) {
    const remaining = report.remaining[m];
    let best: NutrientPick | null = null, bestScore = -Infinity;
    for (const f of foods) {
      if (!isAllowed(diet, f, avoid) || f.category === "supplement" || f.category === "sweet" || f[m] <= 0) continue;
      const grams = f.servingG;
      const n = nutrientsFor(f, grams);
      if (n.kcal > report.remaining.kcal + 80) continue;
      const coverage = Math.min(1, n[m] / Math.max(remaining, 1));
      if (coverage < 0.25) continue;
      const score = coverage - 0.0006 * n.kcal;
      if (score > bestScore) { bestScore = score; best = { food: f, grams, micro: m, provided: n[m], remaining }; }
    }
    if (best) return best;
  }
  return null;
}
