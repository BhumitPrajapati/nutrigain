"use client";
import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Search } from "lucide-react";
import { nutrientsFor } from "@/lib/engine";
import type { Food } from "@/lib/types";

export default function ScaleLog({
  recent, defaultTime, onAdd, foods, byId, onAddFood, selectId,
}: {
  recent: string[]; defaultTime: string; onAdd: (foodId: string, grams: number, time: string) => void;
  foods: Food[]; byId: Record<string, Food>; onAddFood: () => void; selectId?: string;
}) {
  const [food, setFood] = useState<Food>(byId.jasmine_rice);
  const [grams, setGrams] = useState("150");
  const [time, setTime] = useState(defaultTime);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const g = Number(grams);
  const valid = Number.isFinite(g) && g > 0 && g <= 2000;
  const n = valid ? nutrientsFor(food, g) : null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...recent.map((id) => byId[id]).filter(Boolean), ...foods.filter((f) => !recent.includes(f.id))].slice(0, 8);
    return foods.filter((f) => f.name.toLowerCase().includes(q) || f.category.includes(q)).slice(0, 8);
  }, [query, recent, foods, byId]);

  useEffect(() => {
    if (selectId && byId[selectId]) { setFood(byId[selectId]); setGrams(String(byId[selectId].servingG)); setQuery(""); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectId]);

  const pick = (f: Food) => { setFood(f); setGrams(String(f.servingG)); setQuery(""); setOpen(false); };
  const step = (d: number) => setGrams(String(Math.max(0, Math.min(2000, Math.round((valid ? g : 0) + d)))));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onAdd(food.id, Math.round(g * 10) / 10, time);
    setGrams(String(food.servingG));
  };

  return (
    <form onSubmit={submit} className="rounded-device bg-device p-5 text-devicetext shadow-[inset_0_-6px_0_rgba(255,255,255,0.06)] sm:p-6" aria-labelledby="scale-h">
      <h2 id="scale-h" className="sr-only">Log food</h2>

      <div className="relative">
        <label htmlFor="food-search" className="mb-1.5 block text-sm text-devicetext/70">Food</label>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink2" aria-hidden />
          <input
            id="food-search" role="combobox" aria-expanded={open} aria-controls="food-list" aria-autocomplete="list"
            className="field !pl-9" autoComplete="off"
            placeholder={food.name} value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, matches.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Enter" && open && matches[active]) { e.preventDefault(); pick(matches[active]); }
              else if (e.key === "Escape") setOpen(false);
            }}
          />
        </div>
        {open && matches.length > 0 && (
          <ul id="food-list" role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-line bg-surface p-1 text-ink shadow-lg">
            {!query && recent.length > 0 && <li className="px-3 pb-1 pt-2 text-xs text-ink2" aria-hidden>Recent</li>}
            {matches.map((f, i) => (
              <li key={f.id} role="option" aria-selected={i === active}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(f)}
                  className={`flex w-full items-baseline justify-between gap-3 rounded-lg px-3 py-2 text-left ${i === active ? "bg-paper" : ""}`}>
                  <span>{f.name}{f.custom && <span className="ml-2 rounded-full bg-protein/15 px-2 py-0.5 text-xs font-semibold text-protein">Yours</span>}</span>
                  <span className="shrink-0 text-xs text-ink2 tabular-nums">{f.kcal} kcal · {f.proteinG} P /100 g</span>
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="px-3 py-2 text-sm text-ink2">No food matches "{query}".</li>}
            <li role="presentation" className="sticky bottom-0 bg-surface pt-1">
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setOpen(false); onAddFood(); }}
                className="flex w-full items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2 text-left font-semibold hover:bg-paper">
                <Plus size={14} aria-hidden /> Add your own food
              </button>
            </li>
          </ul>
        )}
      </div>

      {/* the scale readout */}
      <div className="mt-4 rounded-2xl bg-glass p-4 text-glassink">
        <p className="truncate text-sm font-semibold">{food.name}</p>
        <div className="flex items-end gap-2">
          <input
            aria-label="Weight in grams" inputMode="decimal" value={grams}
            onChange={(e) => setGrams(e.target.value.replace(/[^0-9.]/g, ""))}
            className="lcd w-full min-w-0 bg-transparent text-[64px] leading-none outline-none sm:text-[80px]"
          />
          <span className="lcd pb-2 text-3xl">g</span>
        </div>
        <p className="mt-2 text-sm tabular-nums" aria-live="polite">
          {n ? `${Math.round(n.kcal)} kcal · ${n.proteinG.toFixed(1)} g protein · ${n.carbsG.toFixed(1)} g carbs · ${n.fatG.toFixed(1)} g fat` : "Enter a weight between 1 and 2000 g."}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {[-50, -10, -1, 1, 10, 50].map((d) => (
          <button key={d} type="button" onClick={() => step(d)}
            className="rounded-full border border-devicetext/25 px-3 py-1.5 text-sm font-semibold tabular-nums hover:bg-devicetext/10"
            aria-label={`${d > 0 ? "Add" : "Remove"} ${Math.abs(d)} grams`}>
            {d > 0 ? <Plus size={12} className="mr-0.5 inline" aria-hidden /> : <Minus size={12} className="mr-0.5 inline" aria-hidden />}{Math.abs(d)}
          </button>
        ))}
        <button type="button" onClick={() => setGrams(String(food.servingG))}
          className="ml-auto rounded-full bg-devicetext/10 px-3 py-1.5 text-sm hover:bg-devicetext/20">
          {food.servingLabel}
        </button>
      </div>

      <div className="mt-4 flex items-end gap-3">
        <div>
          <label htmlFor="eat-time" className="mb-1.5 block text-sm text-devicetext/70">Time</label>
          <input id="eat-time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="field !w-auto" />
        </div>
        <button type="submit" disabled={!valid}
          className="btn flex-1 bg-glass py-3 text-base text-glassink hover:brightness-110 disabled:opacity-40">
          Add {valid ? `${g} g` : ""} to today
        </button>
      </div>
    </form>
  );
}
