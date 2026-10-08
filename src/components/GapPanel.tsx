import { CircleCheck, Flame, Plus } from "lucide-react";
import type { DietPref, GapReport, Suggestion } from "@/lib/types";

const MICRO_LABEL: Record<string, string> = { fiberG: "fiber", calciumMg: "calcium", ironMg: "iron", potassiumMg: "potassium" };

export default function GapPanel({
  report, suggestions, evening, diet, onDiet, onLog,
}: {
  report: GapReport; suggestions: Suggestion[]; evening: boolean;
  diet: DietPref; onDiet: (d: DietPref) => void; onLog: (s: Suggestion) => void;
}) {
  const r = report.remaining;
  const chips = [
    { label: "Protein", v: `${Math.round(r.proteinG)} g`, c: "bg-protein" },
    { label: "Calories", v: `${Math.round(r.kcal)} kcal`, c: "bg-ink" },
    { label: "Carbs", v: `${Math.round(r.carbsG)} g`, c: "bg-carbs" },
    { label: "Fat", v: `${Math.round(r.fatG)} g`, c: "bg-fat" },
  ];
  return (
    <section className="panel overflow-hidden" aria-labelledby="gap-h">
      <div className="border-b border-line p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="gap-h" className="font-display text-xl font-bold">{evening ? "Close out the day" : "What's left today"}</h2>
          <label className="flex items-center gap-2 text-sm text-ink2">
            Eating
            <select className="rounded-lg border border-line bg-surface px-2 py-1 text-ink" value={diet} onChange={(e) => onDiet(e.target.value as DietPref)}>
              <option value="omnivore">anything</option>
              <option value="vegetarian">vegetarian</option>
              <option value="vegan">vegan</option>
            </select>
          </label>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {chips.map((c) => (
            <li key={c.label} className="rounded-xl bg-surface px-3 py-2">
              <span className="flex items-center gap-1.5 text-sm text-ink2"><span className={`h-2 w-2 rounded-full ${c.c}`} aria-hidden />{c.label}</span>
              <span className="font-display text-xl font-bold tabular-nums">{c.v}</span>
            </li>
          ))}
        </ul>
        {report.missingMicros.length > 0 && (
          <p className="mt-3 text-sm text-ink2">
            Running low on {report.missingMicros.map((m) => MICRO_LABEL[m]).join(", ")}. Suggestions below favor foods that help.
          </p>
        )}
      </div>

      <div className="p-5">
        {report.status === "over" && (
          <p className="flex gap-2"><Flame className="mt-0.5 shrink-0 text-over" size={18} aria-hidden />
            You are past your calorie target. Skip the extras tonight; a small surplus is fine, and protein is the number that matters.</p>
        )}
        {report.status === "on-track" && (
          <p className="flex gap-2"><CircleCheck className="mt-0.5 shrink-0 text-protein" size={18} aria-hidden />
            Calories and protein are covered. Check water and supplements, then you are done.</p>
        )}
        {report.status === "gap" && suggestions.length === 0 && (
          <p className="text-ink2">Nothing in the food list fits the remaining budget without overshooting fat or calories. Try a lighter option from your own foods.</p>
        )}
        {suggestions.length > 0 && (
          <ol className="grid gap-3 lg:grid-cols-3">
            {suggestions.map((s, i) => (
              <li key={i} className="flex flex-col rounded-xl border border-line bg-surface p-4">
                <ul className="space-y-1">
                  {s.items.map((it) => (
                    <li key={it.foodId} className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold leading-snug">{it.name}</span>
                      <span className="shrink-0 text-sm text-ink2 tabular-nums">{it.label}</span>
                    </li>
                  ))}
                </ul>
                {s.hint && <p className="mt-2 text-sm text-ink2">{s.hint}</p>}
                <p className="mt-3 text-sm tabular-nums">
                  <span className="font-semibold text-protein">+{Math.round(s.added.proteinG)} g protein</span>, {Math.round(s.added.kcal)} kcal,
                  {" "}{Math.round(s.added.carbsG)} g carbs, {Math.round(s.added.fatG)} g fat
                </p>
                <p className="mt-1 text-xs text-ink2">{s.summary}</p>
                <button className="btn-ink mt-4 self-start" onClick={() => onLog(s)}><Plus size={14} aria-hidden /> Log this</button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
