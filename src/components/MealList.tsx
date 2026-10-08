import { Trash2 } from "lucide-react";
import { nutrientsFor } from "@/lib/engine";
import type { DayLog, Food } from "@/lib/types";

export default function MealList({ day, byId, onRemove }: { day: DayLog; byId: Record<string, Food>; onRemove: (id: string) => void }) {
  const entries = [...day.entries].sort((a, b) => a.time.localeCompare(b.time));
  return (
    <section className="panel p-5" aria-labelledby="meals-h">
      <h2 id="meals-h" className="font-display text-lg font-bold">On the scale today</h2>
      {entries.length === 0 ? (
        <p className="mt-3 text-ink2">Nothing weighed yet. Pick a food above and add the first one.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {entries.map((e) => {
            const f = byId[e.foodId];
            if (!f) return null;
            const n = nutrientsFor(f, e.grams);
            return (
              <li key={e.id} className="flex items-center gap-3 py-3">
                <span className="w-12 text-sm text-ink2 tabular-nums">{e.time}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{f.name}</p>
                  <p className="text-sm text-ink2 tabular-nums">{e.grams} g · {Math.round(n.kcal)} kcal · {n.proteinG.toFixed(1)} P · {n.carbsG.toFixed(1)} C · {n.fatG.toFixed(1)} F</p>
                </div>
                <button className="rounded-full p-2 text-ink2 hover:bg-paper hover:text-over" onClick={() => onRemove(e.id)} aria-label={`Remove ${e.grams} grams of ${f.name}`}>
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
