import type { Nutrients } from "@/lib/types";

export interface SupplementPreset {
  id: string;
  name: string;
  doseLabel: string;
  doseG: number;
  /** When set, each dose also logs this food (so whey counts toward macros). */
  foodId?: string;
  /** Micronutrients per dose for products that have no food entry. */
  micros?: Partial<Nutrients>;
  note: string;
}

export const SUPPLEMENTS: SupplementPreset[] = [
  { id: "creatine", name: "Creatine monohydrate", doseLabel: "5 g", doseG: 5, note: "Take daily, training day or not. Needs extra water." },
  { id: "whey", name: "Whey protein", doseLabel: "1 scoop = 30 g", doseG: 30, foodId: "whey", note: "One level scoop is 30 g, about 24 g protein." },
  { id: "multivitamin", name: "Multivitamin", doseLabel: "1 tablet", doseG: 1, micros: { calciumMg: 200, ironMg: 8, potassiumMg: 80 }, note: "Typical label values; check your own product." },
  { id: "omega3", name: "Fish oil", doseLabel: "1 g EPA+DHA", doseG: 1, note: "Take with a meal that contains fat." },
];

export const CREATINE_ID = "creatine";
