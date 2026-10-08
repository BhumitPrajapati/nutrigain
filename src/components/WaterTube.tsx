import { Droplet, Plus, TriangleAlert } from "lucide-react";
import type { HydrationStatus } from "@/lib/engine";

export default function WaterTube({
  ml, target, status, onAdd, creatine,
}: { ml: number; target: number; status: HydrationStatus; onAdd: (ml: number) => void; creatine: boolean }) {
  const pct = Math.min(1, ml / target);
  const ticks = Math.floor(target / 500);
  return (
    <section className="panel p-5" aria-labelledby="water-h">
      <h2 id="water-h" className="font-display text-lg font-bold">Water</h2>
      <div className="mt-4 flex gap-5">
        <div className="relative h-40 w-12 shrink-0 overflow-hidden rounded-full border-2 border-water/50 bg-surface" role="img" aria-label={`${ml} of ${target} millilitres`}>
          <div className="tube-fill absolute inset-x-0 bottom-0 bg-water" style={{ height: `${pct * 100}%` }} />
          {Array.from({ length: ticks }, (_, i) => (
            <span key={i} className="absolute right-0 h-px w-3 bg-ink/40" style={{ bottom: `${(((i + 1) * 500) / target) * 100}%` }} />
          ))}
        </div>
        <div className="flex flex-1 flex-col justify-between">
          <p>
            <span className="font-display text-3xl font-bold tabular-nums">{(ml / 1000).toFixed(2)}</span>
            <span className="text-ink2"> / {(target / 1000).toFixed(1)} L</span>
          </p>
          <p className="text-sm text-ink2">{creatine ? "Target includes +500 mL for creatine." : "35 mL per kg of body weight."}</p>
          <div className="flex flex-wrap gap-2">
            {[250, 500].map((v) => (
              <button key={v} className="btn-ghost" onClick={() => onAdd(v)} aria-label={`Add ${v} millilitres`}>
                <Plus size={14} aria-hidden /> {v} mL
              </button>
            ))}
            {ml > 0 && <button className="btn-ghost" onClick={() => onAdd(-250)} aria-label="Remove 250 millilitres">−250</button>}
          </div>
        </div>
      </div>
      {status.level !== "ok" && (
        <p role="status" className={`mt-4 flex gap-2 rounded-xl p-3 text-sm ${status.level === "critical" ? "bg-over text-onaccent" : "bg-carbs/20 text-ink"}`}>
          <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
          <span>{status.message}</span>
        </p>
      )}
      {status.level === "ok" && <p className="mt-4 flex items-center gap-2 text-sm text-ink2"><Droplet size={14} aria-hidden /> On pace for this time of day.</p>}
    </section>
  );
}
