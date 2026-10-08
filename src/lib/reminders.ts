import { FOODS } from "@/data/foods";
import { dayTotals, computeGap, computeTargets, hydrationStatus, MICRO_INFO, nutrientRichPick, recommend } from "./engine";
import { localParts, toMin } from "./dates";
import type { DayLog, Food, Profile, ReminderPrefs } from "./types";

export const DEFAULT_REMINDERS: ReminderPrefs = {
  enabled: false, water: true, food: true, closeout: true,
  waterEveryMin: 90, foodEveryHours: 4, closeoutTime: "20:30", quietStart: "22:00", quietEnd: "07:00", tz: "UTC",
};

export type ReminderKind = "water" | "food" | "closeout";
export interface Reminder { kind: ReminderKind; title: string; body: string; tag: string }

export function inQuietHours(hhmm: string, start: string, end: string): boolean {
  const t = toMin(hhmm), s = toMin(start), e = toMin(end);
  if (s === e) return false;
  return s < e ? t >= s && t < e : t >= s || t < e; // window may wrap past midnight
}

const minutesSince = (iso: string | undefined, now: Date) => (iso ? (now.getTime() - Date.parse(iso)) / 60000 : Infinity);
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/**
 * Decides which reminders are due right now. Pure: the browser and the server cron both call this.
 * `lastSent` maps a reminder kind to the ISO time it was last sent.
 */
export function planReminders(input: {
  now: Date; prefs: ReminderPrefs; profile: Profile; day: DayLog; customFoods?: Food[]; lastSent: Partial<Record<ReminderKind, string>>;
}): Reminder[] {
  const { now, prefs, profile, day, lastSent } = input;
  if (!prefs.enabled) return [];
  const { iso, hhmm, hour } = localParts(now, prefs.tz);
  if (inQuietHours(hhmm, prefs.quietStart, prefs.quietEnd)) return [];

  const foods = [...FOODS, ...(input.customFoods ?? [])];
  const creatine = profile.creatine !== false;
  const targets = computeTargets(profile, creatine);
  const byId = Object.fromEntries(foods.map((f) => [f.id, f]));
  const logged = dayTotals(day, byId);
  const report = computeGap(targets, logged);
  const opts = { diet: profile.diet, avoid: profile.avoid ?? [] };
  const out: Reminder[] = [];

  // 1. evening close-out, once a day
  if (prefs.closeout && hhmm >= prefs.closeoutTime && (lastSent.closeout ? localParts(new Date(lastSent.closeout), prefs.tz).iso : "") !== iso && report.status !== "over") {
    const r = report.remaining;
    if (r.proteinG >= 15 || r.kcal >= 300) {
      const s = recommend(report, foods, opts)[0];
      const what = s ? s.items.map((i) => `${i.label} ${i.name.toLowerCase()}`).join(" + ") : "a protein-rich snack";
      out.push({
        kind: "closeout", tag: "nutrigain-closeout", title: "Close out the day",
        body: `You are short ${fmt(r.proteinG)} g protein and ${fmt(r.kcal)} kcal. Try ${what}.`,
      });
    }
  }

  // 2. water, when behind the pace for this time of day
  if (prefs.water && minutesSince(lastSent.water, now) >= prefs.waterEveryMin) {
    const h = hydrationStatus(day.waterMl, targets.waterMl, creatine, hour);
    if (h.level !== "ok") {
      const behind = h.expectedMl - day.waterMl;
      const drink = Math.round(Math.min(behind, 750) / 50) * 50;
      out.push({
        kind: "water", tag: "nutrigain-water", title: "Time for water",
        body: `You are ${fmt(behind)} mL behind today's pace. Have about ${fmt(drink)} mL now.${creatine ? " Creatine needs the extra water." : ""}`,
      });
    }
  }

  // 3. nutrient-rich food, when it has been a while since the last meal or a micronutrient is low
  if (prefs.food && minutesSince(lastSent.food, now) >= 120 && report.status !== "over" && report.remaining.kcal > 150) {
    const lastMeal = day.entries.map((e) => e.time).sort().pop();
    const since = lastMeal ? hour - toMin(lastMeal) / 60 : hour - toMin(prefs.quietEnd) / 60;
    if (since >= prefs.foodEveryHours && hour >= toMin(prefs.quietEnd) / 60 + 1) {
      const pick = nutrientRichPick(report, foods, opts);
      if (pick) {
        const info = MICRO_INFO[pick.micro];
        out.push({
          kind: "food", tag: "nutrigain-food", title: `Eat something with ${info.label}`,
          body: `${lastMeal ? `It has been ${Math.floor(since)} h since you logged food. ` : ""}You are low on ${info.label} today. ${pick.food.name} (${pick.grams} g) gives about ${fmt(pick.provided)} ${info.unit}.`,
        });
      } else {
        const s = recommend(report, foods, opts)[0];
        if (s) out.push({ kind: "food", tag: "nutrigain-food", title: "Time to eat", body: `${s.items.map((i) => `${i.label} ${i.name.toLowerCase()}`).join(" + ")}. ${s.summary}.` });
      }
    }
  }
  return out.slice(0, 2);
}
