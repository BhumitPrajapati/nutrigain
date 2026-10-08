import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./auth-crypto";
import { sanitizeDay, sanitizeFood, sanitizeProfile, sanitizeReminders } from "./validate";

describe("passwords", () => {
  it("verifies the right password only, with unique salts", () => {
    const h = hashPassword("correct horse");
    expect(verifyPassword("correct horse", h)).toBe(true);
    expect(verifyPassword("wrong", h)).toBe(false);
    expect(hashPassword("correct horse")).not.toBe(h);
  });
});

describe("validation", () => {
  const profile = { name: "A", sex: "male", age: 25, heightCm: 175, weightKg: 70, activity: "moderate", surplus: "standard", diet: "omnivore" };
  it("accepts a good profile and rejects out-of-range values", () => {
    expect(sanitizeProfile(profile)?.weightKg).toBe(70);
    expect(sanitizeProfile({ ...profile, weightKg: 5 })).toBeNull();
    expect(sanitizeProfile({ ...profile, sex: "x" })).toBeNull();
  });
  it("sanitizes days", () => {
    const ok = { entries: [{ id: "a", foodId: "oats", grams: 80, time: "07:30" }], waterMl: 500, supplements: { creatine: 1 }, junk: 1 };
    expect(sanitizeDay(ok)).toEqual({ entries: ok.entries, waterMl: 500, supplements: { creatine: 1 } });
    expect(sanitizeDay({ ...ok, entries: [{ id: "a", foodId: "oats", grams: -5, time: "07:30" }] })).toBeNull();
    expect(sanitizeDay({ ...ok, entries: [{ id: "a", foodId: "oats", grams: 5, time: "7:30" }] })).toBeNull();
    expect(sanitizeDay({ ...ok, waterMl: 1e9 })).toBeNull();
  });
});

describe("custom foods, wellness fields and reminder settings", () => {
  const food = { id: "c_abc123", name: "Protein bar", kcal: 380, proteinG: 30, carbsG: 35, fatG: 12, fiberG: 8, diet: "vg", servingG: 60, servingLabel: "1 bar", minG: 60, maxG: 120, contains: ["dairy", "bogus"] };
  it("accepts a good food and normalises it", () => {
    const f = sanitizeFood(food)!;
    expect(f.category).toBe("custom"); expect(f.contains).toEqual(["dairy"]); expect(f.potassiumMg).toBe(0);
  });
  it("rejects impossible foods", () => {
    expect(sanitizeFood({ ...food, proteinG: 60, carbsG: 50 })).toBeNull(); // 110 g of macros in 100 g
    expect(sanitizeFood({ ...food, id: "bad id" })).toBeNull();
    expect(sanitizeFood({ ...food, kcal: -1 })).toBeNull();
    expect(sanitizeFood({ ...food, name: " " })).toBeNull();
  });
  it("keeps wellness fields and drops junk", () => {
    const day = { entries: [], waterMl: 0, supplements: {}, checkin: { sleepH: 7.5, mood: 4, energy: 9, x: 1 }, workout: { type: "Strength", minutes: 45, rpe: 7 }, weightKg: 70.4, mindfulMin: 5, habits: { walk: true, bad: "yes" } };
    expect(sanitizeDay(day)).toEqual({ entries: [], waterMl: 0, supplements: {}, checkin: { sleepH: 7.5, mood: 4 }, workout: { type: "Strength", minutes: 45, rpe: 7 }, weightKg: 70.4, mindfulMin: 5, habits: { walk: true } });
  });
  it("validates reminder settings", () => {
    const r = { enabled: true, water: true, food: false, closeout: true, waterEveryMin: 90, foodEveryHours: 4, closeoutTime: "20:30", quietStart: "22:00", quietEnd: "07:00", tz: "America/Toronto" };
    expect(sanitizeReminders(r)?.tz).toBe("America/Toronto");
    expect(sanitizeReminders({ ...r, tz: "Mars/Base" })?.tz).toBe("UTC");
    expect(sanitizeReminders({ ...r, quietStart: "25:00" })).toBeNull();
    expect(sanitizeReminders({ ...r, waterEveryMin: 5 })).toBeNull();
  });
});
