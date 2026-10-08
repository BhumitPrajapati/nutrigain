import { Check, Minus, Plus } from "lucide-react";
import { SUPPLEMENTS } from "@/data/supplements";
import type { DayLog } from "@/lib/types";

export default function Supplements({ day, onChange }: { day: DayLog; onChange: (id: string, delta: number) => void }) {
  return (
    <section className="panel p-5" aria-labelledby="supp-h">
      <h2 id="supp-h" className="font-display text-lg font-bold">Supplements</h2>
      <ul className="mt-3 divide-y divide-line">
        {SUPPLEMENTS.map((s) => {
          const n = day.supplements[s.id] ?? 0;
          const multi = s.id === "whey";
          return (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight">{s.name}</p>
                <p className="text-sm text-ink2">{s.doseLabel}</p>
              </div>
              {multi ? (
                <div className="flex items-center gap-1">
                  <button className="btn-ghost !px-2.5" onClick={() => onChange(s.id, -1)} disabled={n === 0} aria-label={`Remove one ${s.name} dose`}><Minus size={14} /></button>
                  <span className="min-w-20 whitespace-nowrap text-center font-display text-lg font-bold tabular-nums">{n} {n === 1 ? "scoop" : "scoops"}</span>
                  <button className="btn-ink !px-2.5" onClick={() => onChange(s.id, 1)} aria-label={`Add one ${s.name} dose`}><Plus size={14} /></button>
                </div>
              ) : n > 0 ? (
                <button className="btn bg-protein text-onaccent hover:bg-protein/90" onClick={() => onChange(s.id, -1)} aria-label={`${s.name} taken. Undo`}><Check size={14} aria-hidden /> Taken</button>
              ) : (
                <button className="btn-ghost" onClick={() => onChange(s.id, 1)} aria-label={`Mark ${s.name} taken`}>Take</button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
