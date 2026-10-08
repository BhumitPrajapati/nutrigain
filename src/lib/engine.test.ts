import { describe, expect, it } from "vitest";
import { FOODS, FOOD_BY_ID } from "@/data/foods";
import {
  calcBmr, computeGap, computeTargets, dayHit, dayTotals, emptyNutrients, hydrationStatus, nutrientsFor, recommend, streak,
} from "./engine";
import type { DayLog, Profile } from "./types";

const me: Profile = { name: "T", sex: "male", age: 25, heightCm: 175, weightKg: 70, activity: "moderate", surplus: "standard", diet: "omnivore" };

describe("targets", () => {
  it("matches Mifflin-St Jeor", () => {
    // 10*70 + 6.25*175 - 5*25 + 5 = 1673.75
    expect(calcBmr(me)).toBeCloseTo(1673.75, 2);
    const t = computeTargets(me);
    expect(t.tdee).toBe(2594);
    expect(t.kcal).toBe(2995); // 2594.3 + 400, rounded to 5
    expect(t.proteinG).toBe(140);
    expect(t.fatG).toBeGreaterThanOrEqual(56);
    // macros add back up to the calorie target (within rounding)
    expect(Math.abs(t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9 - t.kcal)).toBeLessThan(20);
  });
  it("adds 500 mL water for creatine", () => {
    expect(computeTargets(me, true).waterMl - computeTargets(me, false).waterMl).toBe(500);
  });
});

describe("logging + gap", () => {
  it("scales macros by grams", () => {
    const n = nutrientsFor(FOOD_BY_ID.chicken_breast, 200);
    expect(n.proteinG).toBeCloseTo(62, 5);
    expect(n.kcal).toBeCloseTo(330, 5);
  });
  it("counts whey scoops and multivitamin micros", () => {
    const day: DayLog = { entries: [], waterMl: 0, supplements: { whey: 2, multivitamin: 1, creatine: 1 } };
    const t = dayTotals(day, FOOD_BY_ID);
    expect(t.proteinG).toBeCloseTo(48, 5);
    expect(t.ironMg).toBeGreaterThan(8);
  });
  it("computes missing = target - logged and never goes negative", () => {
    const t = computeTargets(me);
    const logged = { ...emptyNutrients(), kcal: 3200, proteinG: 100 };
    const g = computeGap(t, logged);
    expect(g.remaining.proteinG).toBe(40);
    expect(g.remaining.kcal).toBe(0);
    expect(g.over.kcal).toBe(3200 - t.kcal);
  });
});

describe("recommender", () => {
  const t = computeTargets(me);
  const gapFor = (p: number, k: number) => {
    const logged = { ...emptyNutrients(), kcal: t.kcal - k, proteinG: t.proteinG - p, carbsG: t.carbsG - k / 8, fatG: t.fatG - k / 40, fiberG: t.fiberG, calciumMg: 1000, ironMg: 8, potassiumMg: 3400 };
    return computeGap(t, logged);
  };
  it("fills 30 g protein / 200 kcal without breaking the budget", () => {
    const s = recommend(gapFor(30, 200), FOODS);
    expect(s.length).toBe(3);
    for (const x of s) {
      expect(x.added.kcal).toBeLessThanOrEqual(200 + 80);
      expect(x.added.proteinG).toBeGreaterThan(18);
    }
  });
  it("respects a vegan diet", () => {
    const s = recommend(gapFor(30, 250), FOODS, { diet: "vegan" });
    expect(s.length).toBeGreaterThan(0);
    for (const x of s) for (const i of x.items) expect(FOOD_BY_ID[i.foodId].diet).toBe("v");
  });
  it("never overshoots fat by more than tolerance", () => {
    const g = gapFor(40, 300);
    for (const x of recommend(g, FOODS)) expect(x.added.fatG).toBeLessThanOrEqual(g.remaining.fatG + 3);
  });
  it("returns nothing when the day is complete or over", () => {
    expect(recommend(gapFor(0, 0), FOODS)).toEqual([]);
    const over = computeGap(t, { ...emptyNutrients(), kcal: t.kcal * 1.3, proteinG: t.proteinG });
    expect(recommend(over, FOODS)).toEqual([]);
  });
});

describe("hydration + streak", () => {
  it("warns sooner with creatine", () => {
    const noCr = hydrationStatus(1200, 3000, false, 15);
    const cr = hydrationStatus(1200, 3000, true, 15);
    expect(["ok", "low", "critical"]).toContain(noCr.level);
    expect(cr.level).not.toBe("ok");
    expect(cr.message).toMatch(/Creatine/);
  });
  it("is quiet in the morning", () => {
    expect(hydrationStatus(0, 3000, true, 7).level).toBe("ok");
  });
  it("counts consecutive hit days", () => {
    const hits = new Set(["2026-10-04", "2026-10-05", "2026-10-06"]);
    expect(streak(hits, "2026-10-06")).toBe(3);
    expect(streak(new Set(["2026-10-04", "2026-10-05"]), "2026-10-06")).toBe(2);
    expect(dayHit({ ...emptyNutrients(), kcal: 2900, proteinG: 135 }, { kcal: 3000, proteinG: 140 })).toBe(true);
  });
});
