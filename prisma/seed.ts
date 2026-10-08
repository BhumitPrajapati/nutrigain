import { PrismaClient } from "@prisma/client";
import { FOODS } from "../src/data/foods";
import { SUPPLEMENTS } from "../src/data/supplements";

const prisma = new PrismaClient();

async function main() {
  for (const f of FOODS) {
    const data = {
      name: f.name, category: f.category, kcal: f.kcal, proteinG: f.proteinG, carbsG: f.carbsG, fatG: f.fatG,
      fiberG: f.fiberG, calciumMg: f.calciumMg, ironMg: f.ironMg, potassiumMg: f.potassiumMg,
      tags: [f.diet === "v" ? "vegan" : f.diet === "vg" ? "vegetarian" : "omnivore"],
      servingG: f.servingG, servingLabel: f.servingLabel,
    };
    await prisma.food.upsert({ where: { id: f.id }, update: data, create: { id: f.id, ...data } });
  }
  console.log(`Seeded ${FOODS.length} foods (${SUPPLEMENTS.length} supplement presets live in src/data/supplements.ts).`);
}
main().finally(() => prisma.$disconnect());
