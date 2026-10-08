export type Diet = "v" | "vg" | "o";
export type DietPref = "omnivore" | "vegetarian" | "vegan";
export type Sex = "male" | "female";
export type Activity = "sedentary" | "light" | "moderate" | "very_active" | "extra_active";
export type SurplusMode = "lean" | "standard" | "aggressive";

/** Nutrient values are per 100 g. */
export interface Food {
  id: string; name: string; category: string;
  kcal: number; proteinG: number; carbsG: number; fatG: number;
  fiberG: number; calciumMg: number; ironMg: number; potassiumMg: number;
  diet: Diet; servingG: number; servingLabel: string; minG: number; maxG: number;
  /** allergen/ingredient tags, see foodTags.ts. Derived for built-in foods. */
  contains?: string[];
  custom?: boolean;
}

export interface Profile {
  name: string; sex: Sex; age: number; heightCm: number; weightKg: number;
  activity: Activity; surplus: SurplusMode; diet: DietPref; creatine?: boolean;
  /** ingredient tags never to suggest, e.g. ["dairy","nuts"] */
  avoid?: string[];
}

export interface Nutrients {
  kcal: number; proteinG: number; carbsG: number; fatG: number;
  fiberG: number; calciumMg: number; ironMg: number; potassiumMg: number;
}

export interface Targets extends Nutrients {
  bmr: number; tdee: number; waterMl: number; surplusKcal: number;
}

export interface MealEntry {
  id: string; foodId: string; grams: number; time: string; // "HH:MM"
}

export interface CheckIn { sleepH?: number; mood?: number; energy?: number; stress?: number } // mood/energy/stress 1-5
export interface Workout { type: string; minutes: number; rpe: number }

export interface DayLog {
  entries: MealEntry[];
  waterMl: number;
  supplements: Record<string, number>; // supplementId -> doses taken
  targetsSnapshot?: Targets;
  checkin?: CheckIn;
  workout?: Workout;
  weightKg?: number;
  mindfulMin?: number;
  habits?: Record<string, boolean>;
}

export interface ReminderPrefs {
  enabled: boolean;
  water: boolean;
  food: boolean;       // nutrient-rich food nudges
  closeout: boolean;   // evening gap summary
  waterEveryMin: number;
  foodEveryHours: number;
  closeoutTime: string; // "HH:MM"
  quietStart: string;
  quietEnd: string;
  tz: string;
}

export interface Suggestion {
  items: { foodId: string; name: string; grams: number; label: string }[];
  added: Nutrients;
  score: number;
  hint?: string;
  summary: string;
}

export interface GapReport {
  status: "on-track" | "gap" | "over";
  remaining: Nutrients;      // clipped at 0
  over: Nutrients;           // how far past target, clipped at 0
  pct: Nutrients;            // logged / target
  missingMicros: ("fiberG" | "calciumMg" | "ironMg" | "potassiumMg")[];
}
