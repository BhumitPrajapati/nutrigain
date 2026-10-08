import { describe, expect, it } from "vitest";
import { FOODS } from "@/data/foods";
import { computeGap, computeTargets, emptyNutrients, isAllowed, nutrientRichPick, recommend } from "./engine";
import { DEFAULT_REMINDERS, inQuietHours, planReminders } from "./reminders";
import { shiftIsoPure } from "./dates";
import { sleepInsight, weekSummary, weightTrend } from "./wellness";
import type { DayLog, Profile } from "./types";

const me: Profile = { name: "T", sex: "male", age: 25, heightCm: 175, weightKg: 70, activity: "moderate", surplus: "standard", diet: "omnivore", creatine: true };
const empty = (): DayLog => ({ entries: [], waterMl: 0, supplements: {} });
const prefs = { ...DEFAULT_REMINDERS, enabled: true, tz: "America/Toronto" };
// 2026-10-07 14:00 in Toronto (EDT, UTC-4) = 18:00Z
const at = (h: number, m = 0) => new Date(Date.UTC(2026, 9, 7, h + 4, m));

describe("avoid + preferences", () => {
  it("never suggests avoided ingredients", () => {
    const t = computeTargets(me);
    const gap = computeGap(t, { ...emptyNutrients(), kcal: t.kcal - 300, proteinG: t.proteinG - 40, carbsG: t.carbsG - 20, fatG: t.fatG - 8, fiberG: t.fiberG, calciumMg: 1000, ironMg: 8, potassiumMg: 3400 });
    for (const x of recommend(gap, FOODS, { avoid: ["dairy", "egg", "fish", "soy"] })) {
      for (const i of x.items) expect(["greek_yogurt", "whey", "casein", "egg_whites", "whole_egg", "cottage_cheese", "tofu", "salmon", "tuna_water"]).not.toContain(i.foodId);
    }
    expect(isAllowed("omnivore", FOODS.find((f) => f.id === "soy_milk")!, ["dairy"])).toBe(true);
    expect(isAllowed("omnivore", FOODS.find((f) => f.id === "skim_milk")!, ["dairy"])).toBe(false);
  });
  it("picks a calcium-rich food when calcium is the lowest micronutrient", () => {
    const t = computeTargets(me);
    const gap = computeGap(t, { ...emptyNutrients(), kcal: 800, proteinG: 60, fiberG: t.fiberG, calciumMg: 100, ironMg: 8, potassiumMg: 3400 });
    const pick = nutrientRichPick(gap, FOODS, { diet: "vegan" });
    expect(pick?.micro).toBe("calciumMg");
    expect(pick?.food.diet).toBe("v");
  });
});

describe("reminders", () => {
  it("handles quiet hours that wrap midnight", () => {
    expect(inQuietHours("23:30", "22:00", "07:00")).toBe(true);
    expect(inQuietHours("06:59", "22:00", "07:00")).toBe(true);
    expect(inQuietHours("07:00", "22:00", "07:00")).toBe(false);
    expect(inQuietHours("12:00", "22:00", "07:00")).toBe(false);
  });
  it("sends nothing when disabled or in quiet hours", () => {
    expect(planReminders({ now: at(14), prefs: { ...prefs, enabled: false }, profile: me, day: empty(), lastSent: {} })).toEqual([]);
    expect(planReminders({ now: at(23), prefs, profile: me, day: empty(), lastSent: {} })).toEqual([]);
  });
  it("nudges water when behind pace, then waits for the interval", () => {
    const first = planReminders({ now: at(14), prefs, profile: me, day: { ...empty(), waterMl: 300 }, lastSent: {} });
    expect(first.some((r) => r.kind === "water")).toBe(true);
    expect(first.find((r) => r.kind === "water")!.body).toMatch(/mL behind/);
    const recent = new Date(at(14).getTime() - 30 * 60000).toISOString();
    expect(planReminders({ now: at(14), prefs, profile: me, day: { ...empty(), waterMl: 300 }, lastSent: { water: recent } }).some((r) => r.kind === "water")).toBe(false);
    expect(planReminders({ now: at(14), prefs, profile: me, day: { ...empty(), waterMl: 2000 }, lastSent: {} }).some((r) => r.kind === "water")).toBe(false);
  });
  it("suggests a nutrient-rich food after a long gap, respecting the diet", () => {
    const day: DayLog = { ...empty(), waterMl: 3000, entries: [{ id: "a", foodId: "oats", grams: 80, time: "08:00" }] };
    const r = planReminders({ now: at(14), prefs, profile: { ...me, diet: "vegan" }, day, lastSent: {} }).find((x) => x.kind === "food");
    expect(r).toBeTruthy();
    expect(r!.body).toMatch(/It has been 6 h/);
  });
  it("sends the close-out once per local day", () => {
    const day: DayLog = { ...empty(), waterMl: 3000, entries: [{ id: "a", foodId: "oats", grams: 80, time: "08:00" }] };
    const p = { ...prefs, quietStart: "23:30" };
    const due = planReminders({ now: at(21), prefs: p, profile: me, day, lastSent: {} }).find((x) => x.kind === "closeout");
    expect(due?.body).toMatch(/short .* g protein/);
    const sent = at(20, 40).toISOString();
    expect(planReminders({ now: at(21), prefs: p, profile: me, day, lastSent: { closeout: sent } }).some((x) => x.kind === "closeout")).toBe(false);
  });
});

describe("wellness maths", () => {
  const today = "2026-10-07";
  const weigh = (perWeek: number, n = 4) => Object.fromEntries(Array.from({ length: n }, (_, i) => {
    const back = (n - 1 - i) * 7; return [shiftIsoPure(today, -back), { ...empty(), weightKg: 70 - (perWeek * back) / 7 }];
  }));
  it("needs enough data for a trend", () => {
    expect(weightTrend({ [today]: { ...empty(), weightKg: 70 } }, today, "standard")).toBeNull();
  });
  it("classifies weekly gain", () => {
    expect(weightTrend(weigh(0.2), today, "standard")?.tone).toBe("ok"); // 0.29%/wk
    const slow = weightTrend(weigh(0.02), today, "standard")!;
    expect(slow.tone).toBe("slow"); expect(slow.suggest).toBe("aggressive");
    const fast = weightTrend(weigh(0.8), today, "standard")!;
    expect(fast.tone).toBe("fast"); expect(fast.suggest).toBe("lean");
  });
  it("summarises the week and sleep pattern", () => {
    const days: Record<string, DayLog> = {};
    for (let i = 0; i < 8; i++) days[shiftIsoPure(today, -i)] = { ...empty(), checkin: i % 2 ? { sleepH: 6, energy: 2, mood: 3 } : { sleepH: 8, energy: 4, mood: 4 }, workout: i < 3 ? { type: "Strength", minutes: 45, rpe: 7 } : undefined, mindfulMin: 5 };
    const s = weekSummary(days, today);
    expect(s.sessions).toBe(3); expect(s.mindfulMin).toBe(35);
    expect(sleepInsight(days, today)).toMatch(/4\.0\/5, versus 2\.0\/5/);
  });
});
