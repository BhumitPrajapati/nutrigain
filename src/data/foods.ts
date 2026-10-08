import type { Food } from "@/lib/types";

type Diet = "v" | "vg" | "o"; // vegan, vegetarian, omnivore
// id, name, category, kcal, protein, carbs, fat, fiber, calcium, iron, potassium (all per 100 g), diet, serving g, serving label, [min g, max g]
const rows: [string, string, string, number, number, number, number, number, number, number, number, Diet, number, string, [number, number]][] = [
  ["jasmine_rice", "Jasmine rice, cooked", "grain", 130, 2.7, 28.2, 0.3, 0.4, 10, 0.2, 35, "v", 150, "1 cup (150 g)", [100, 350]],
  ["oats", "Rolled oats, dry", "grain", 389, 16.9, 66.3, 6.9, 10.6, 54, 4.7, 429, "v", 40, "½ cup (40 g)", [30, 100]],
  ["pasta", "Pasta, cooked", "grain", 158, 5.8, 30.9, 0.9, 1.8, 7, 1.3, 44, "v", 140, "1 cup (140 g)", [100, 300]],
  ["quinoa", "Quinoa, cooked", "grain", 120, 4.4, 21.3, 1.9, 2.8, 17, 1.5, 172, "v", 185, "1 cup (185 g)", [100, 300]],
  ["wheat_bread", "Whole-wheat bread", "grain", 247, 13, 41, 3.4, 7, 107, 2.4, 248, "v", 40, "1 slice (40 g)", [40, 120]],
  ["chicken_breast", "Chicken breast, cooked", "meat", 165, 31, 0, 3.6, 0, 15, 1, 256, "o", 150, "1 breast (150 g)", [100, 300]],
  ["turkey_breast", "Turkey breast, roasted", "meat", 135, 30, 0, 0.7, 0, 10, 0.7, 293, "o", 120, "1 serving (120 g)", [80, 250]],
  ["lean_beef", "Lean beef 95%, cooked", "meat", 171, 26.1, 0, 6.6, 0, 15, 2.6, 330, "o", 120, "1 patty (120 g)", [80, 250]],
  ["salmon", "Salmon, cooked", "fish", 206, 22, 0, 12, 0, 9, 0.4, 384, "o", 140, "1 fillet (140 g)", [100, 250]],
  ["tuna_water", "Tuna in water, drained", "fish", 116, 25.5, 0, 0.8, 0, 11, 1.4, 237, "o", 120, "1 can (120 g)", [80, 240]],
  ["cod", "Cod, cooked", "fish", 105, 23, 0, 0.9, 0, 14, 0.5, 244, "o", 150, "1 fillet (150 g)", [100, 250]],
  ["shrimp", "Shrimp, cooked", "fish", 99, 24, 0.2, 0.3, 0, 70, 0.5, 259, "o", 100, "100 g", [80, 250]],
  ["egg_whites", "Egg whites", "egg", 52, 10.9, 0.7, 0.2, 0, 7, 0.1, 163, "vg", 100, "≈3 whites (100 g)", [100, 300]],
  ["whole_egg", "Whole egg", "egg", 143, 12.6, 0.7, 9.5, 0, 56, 1.8, 138, "vg", 50, "1 large egg (50 g)", [50, 200]],
  ["greek_yogurt", "Greek yogurt, nonfat", "dairy", 59, 10.2, 3.6, 0.4, 0, 110, 0.1, 141, "vg", 170, "¾ cup (170 g)", [100, 350]],
  ["cottage_cheese", "Cottage cheese, low-fat", "dairy", 72, 12.4, 2.7, 1, 0, 61, 0.1, 125, "vg", 113, "½ cup (113 g)", [100, 300]],
  ["skim_milk", "Skim milk", "dairy", 34, 3.4, 5, 0.1, 0, 122, 0, 166, "vg", 240, "1 glass (240 g)", [200, 480]],
  ["whey", "Whey protein powder", "supplement", 400, 80, 8, 6, 0, 400, 0.5, 500, "vg", 30, "1 scoop (30 g)", [30, 60]],
  ["casein", "Casein protein powder", "supplement", 370, 78, 8, 2, 0, 600, 0.5, 300, "vg", 30, "1 scoop (30 g)", [30, 60]],
  ["pea_protein", "Pea protein powder", "supplement", 380, 78, 6, 7, 2, 80, 12, 100, "v", 30, "1 scoop (30 g)", [30, 60]],
  ["tofu", "Tofu, firm", "plant", 144, 17.3, 2.8, 8.7, 2.3, 683, 2.7, 237, "v", 200, "200 g", [100, 400]],
  ["tempeh", "Tempeh", "plant", 192, 20.3, 7.6, 10.8, 0, 111, 2.7, 412, "v", 100, "100 g", [80, 250]],
  ["seitan", "Seitan", "plant", 143, 25, 5.5, 1.9, 0.5, 20, 3, 60, "v", 100, "100 g", [80, 250]],
  ["edamame", "Edamame, shelled", "plant", 121, 11.9, 8.9, 5.2, 5.2, 63, 2.3, 436, "v", 100, "100 g", [80, 250]],
  ["lentils", "Lentils, cooked", "legume", 116, 9, 20.1, 0.4, 7.9, 19, 3.3, 369, "v", 200, "1 cup (200 g)", [100, 350]],
  ["chickpeas", "Chickpeas, cooked", "legume", 164, 8.9, 27.4, 2.6, 7.6, 49, 2.9, 291, "v", 160, "1 cup (160 g)", [100, 300]],
  ["black_beans", "Black beans, cooked", "legume", 132, 8.9, 23.7, 0.5, 8.7, 27, 2.1, 355, "v", 170, "1 cup (170 g)", [100, 300]],
  ["banana", "Banana", "fruit", 89, 1.1, 22.8, 0.3, 2.6, 5, 0.3, 358, "v", 118, "1 medium (118 g)", [118, 240]],
  ["apple", "Apple", "fruit", 52, 0.3, 13.8, 0.2, 2.4, 6, 0.1, 107, "v", 180, "1 medium (180 g)", [180, 360]],
  ["blueberries", "Blueberries", "fruit", 57, 0.7, 14.5, 0.3, 2.4, 6, 0.3, 77, "v", 150, "1 cup (150 g)", [100, 300]],
  ["dates", "Medjool dates", "fruit", 277, 1.8, 75, 0.2, 6.7, 64, 0.9, 696, "v", 24, "1 date (24 g)", [24, 96]],
  ["orange_juice", "Orange juice", "fruit", 45, 0.7, 10.4, 0.2, 0.2, 11, 0.2, 200, "v", 240, "1 glass (240 g)", [200, 480]],
  ["sweet_potato", "Sweet potato, baked", "veg", 90, 2, 20.7, 0.2, 3.3, 38, 0.7, 475, "v", 200, "1 medium (200 g)", [150, 400]],
  ["potato", "Potato, boiled", "veg", 87, 1.9, 20.1, 0.1, 1.8, 5, 0.3, 328, "v", 200, "1 medium (200 g)", [150, 400]],
  ["broccoli", "Broccoli, cooked", "veg", 35, 2.4, 7.2, 0.4, 3.3, 40, 0.7, 293, "v", 90, "1 cup (90 g)", [90, 180]],
  ["spinach", "Spinach, cooked", "veg", 23, 3, 3.8, 0.3, 2.4, 136, 3.6, 466, "v", 180, "1 cup (180 g)", [90, 180]],
  ["avocado", "Avocado", "fat", 160, 2, 8.5, 14.7, 6.7, 12, 0.6, 485, "v", 70, "½ avocado (70 g)", [70, 140]],
  ["almonds", "Almonds", "fat", 579, 21.2, 21.6, 49.9, 12.5, 269, 3.7, 733, "v", 28, "1 handful (28 g)", [28, 56]],
  ["peanut_butter", "Peanut butter", "fat", 588, 25, 20, 50, 6, 49, 1.9, 649, "v", 16, "1 tbsp (16 g)", [16, 48]],
  ["chia", "Chia seeds", "fat", 486, 16.5, 42.1, 30.7, 34.4, 631, 7.7, 407, "v", 12, "1 tbsp (12 g)", [12, 36]],
  ["olive_oil", "Olive oil", "fat", 884, 0, 0, 100, 0, 1, 0.6, 1, "v", 14, "1 tbsp (14 g)", [14, 28]],
  ["honey", "Honey", "sweet", 304, 0.3, 82.4, 0, 0.2, 6, 0.4, 52, "vg", 21, "1 tbsp (21 g)", [21, 42]],
  ["soy_milk", "Soy milk, unsweetened", "dairy", 33, 2.9, 1.7, 1.8, 0.4, 123, 0.4, 118, "v", 240, "1 glass (240 g)", [200, 480]],
];

export const FOODS: Food[] = rows.map(
  ([id, name, category, kcal, proteinG, carbsG, fatG, fiberG, calciumMg, ironMg, potassiumMg, diet, servingG, servingLabel, [minG, maxG]]) => ({
    id, name, category, kcal, proteinG, carbsG, fatG, fiberG, calciumMg, ironMg, potassiumMg,
    diet, servingG, servingLabel, minG, maxG,
  }),
);

export const FOOD_BY_ID: Record<string, Food> = Object.fromEntries(FOODS.map((f) => [f.id, f]));

/** Combos that read like a real snack rather than two ingredients. */
export const RECIPE_HINTS: Record<string, string> = {
  "greek_yogurt+whey": "Stir the scoop into the yogurt for a thick protein pudding.",
  "greek_yogurt+blueberries": "Yogurt bowl topped with blueberries.",
  "greek_yogurt+honey": "Yogurt with a drizzle of honey.",
  "cottage_cheese+blueberries": "Cottage cheese bowl with berries.",
  "egg_whites+wheat_bread": "Egg-white scramble on toast.",
  "egg_whites+avocado": "Egg-white scramble with sliced avocado.",
  "whey+banana": "Blend into a banana protein shake.",
  "whey+skim_milk": "Shake the scoop with cold milk.",
  "whey+oats": "Protein oats: cook the oats, stir in the scoop after.",
  "casein+skim_milk": "Slow-digesting casein shake before bed.",
  "pea_protein+banana": "Blend into a banana protein shake.",
  "pea_protein+soy_milk": "Shake with soy milk for a fully plant-based shot.",
  "tofu+jasmine_rice": "Pan-seared tofu over rice.",
  "tuna_water+wheat_bread": "Tuna toast.",
  "tempeh+sweet_potato": "Roasted tempeh with baked sweet potato.",
  "peanut_butter+banana": "Banana with peanut butter.",
  "peanut_butter+wheat_bread": "Peanut butter toast.",
  "whey+peanut_butter": "Blend into a peanut butter shake.",
  "chicken_breast+jasmine_rice": "Chicken and rice bowl.",
  "edamame+jasmine_rice": "Edamame rice bowl.",
};
