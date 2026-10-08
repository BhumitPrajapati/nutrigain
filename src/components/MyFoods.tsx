import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Food } from "@/lib/types";

export default function MyFoods({ foods, usage, onAdd, onEdit, onDelete }: {
  foods: Food[]; usage: Record<string, number>; onAdd: () => void; onEdit: (f: Food) => void; onDelete: (f: Food) => void;
}) {
  return (
    <section className="panel p-5 sm:p-6" aria-labelledby="mf-h">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="mf-h" className="font-display text-xl font-bold">My foods</h2>
          <p className="text-ink2">Foods that aren't in the list: homemade meals, packaged products, restaurant dishes. Copy the numbers from the label.</p>
        </div>
        <button className="btn-ink" onClick={onAdd}><Plus size={14} aria-hidden /> Add a food</button>
      </div>
      {foods.length === 0 ? (
        <p className="mt-5 rounded-xl bg-surface p-4 text-ink2">No custom foods yet. Add one and it shows up in the food search, and in suggestions and reminders if it fits your diet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {foods.map((f) => (
            <li key={f.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{f.name}</p>
                <p className="text-sm text-ink2 tabular-nums">Per 100 g: {Math.round(f.kcal)} kcal · {f.proteinG} P · {f.carbsG} C · {f.fatG} F · {f.fiberG} fiber{usage[f.id] ? ` · used ${usage[f.id]}×` : ""}</p>
              </div>
              <button className="rounded-full p-2 hover:bg-paper" onClick={() => onEdit(f)} aria-label={`Edit ${f.name}`}><Pencil size={16} /></button>
              <button className="rounded-full p-2 text-ink2 hover:bg-paper hover:text-over" onClick={() => onDelete(f)} aria-label={`Delete ${f.name}`}><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
