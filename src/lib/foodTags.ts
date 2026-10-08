import type { Food } from "./types";

export const AVOID_OPTIONS: { id: string; label: string }[] = [
  { id: "meat", label: "Meat" },
  { id: "fish", label: "Fish and shellfish" },
  { id: "egg", label: "Eggs" },
  { id: "dairy", label: "Dairy" },
  { id: "soy", label: "Soy" },
  { id: "nuts", label: "Nuts and peanuts" },
  { id: "gluten", label: "Gluten" },
];

const SOY = new Set(["tofu", "tempeh", "edamame", "soy_milk"]);
const NUTS = new Set(["almonds", "peanut_butter"]);
const GLUTEN = new Set(["pasta", "wheat_bread", "seitan"]);

/** Ingredient tags for a food. Custom foods carry their own list. */
export function foodContains(f: Food): string[] {
  if (f.contains) return f.contains;
  const tags: string[] = [];
  if (f.category === "meat") tags.push("meat");
  if (f.category === "fish") tags.push("fish");
  if (f.category === "egg") tags.push("egg");
  if ((f.category === "dairy" && f.id !== "soy_milk") || f.id === "whey" || f.id === "casein") tags.push("dairy");
  if (SOY.has(f.id)) tags.push("soy");
  if (NUTS.has(f.id)) tags.push("nuts");
  if (GLUTEN.has(f.id)) tags.push("gluten");
  return tags;
}
