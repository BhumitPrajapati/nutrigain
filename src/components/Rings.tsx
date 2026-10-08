import type { Nutrients, Targets } from "@/lib/types";

const RINGS = [
  { key: "kcal", label: "Calories", unit: "kcal", color: "rgb(var(--ink))", r: 100 },
  { key: "proteinG", label: "Protein", unit: "g", color: "rgb(var(--protein))", r: 80 },
  { key: "carbsG", label: "Carbs", unit: "g", color: "rgb(var(--carbs))", r: 60 },
  { key: "fatG", label: "Fat", unit: "g", color: "rgb(var(--fat))", r: 40 },
] as const;

export default function Rings({ logged, targets }: { logged: Nutrients; targets: Targets }) {
  const left = Math.round(targets.kcal - logged.kcal);
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      <svg
        viewBox="0 0 240 240" className="h-56 w-56 shrink-0" role="img"
        aria-label={RINGS.map((r) => `${r.label} ${Math.round(logged[r.key])} of ${targets[r.key]} ${r.unit}`).join(", ")}
      >
        {RINGS.map((r) => {
          const C = 2 * Math.PI * r.r;
          const pct = Math.min(1, targets[r.key] ? logged[r.key] / targets[r.key] : 0);
          return (
            <g key={r.key} transform="rotate(-90 120 120)">
              <circle cx="120" cy="120" r={r.r} fill="none" stroke={r.color} strokeOpacity="0.13" strokeWidth="14" />
              <circle
                className="ring" cx="120" cy="120" r={r.r} fill="none" stroke={r.color} strokeWidth="14"
                strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
                style={{ opacity: pct === 0 ? 0 : 1 }}
              />
            </g>
          );
        })}
        <text x="120" y="118" textAnchor="middle" className="fill-ink font-display" style={{ fontSize: 26, fontWeight: 800 }}>
          {Math.abs(left)}
        </text>
        <text x="120" y="136" textAnchor="middle" className="fill-ink2 font-body" style={{ fontSize: 10 }}>
          {left >= 0 ? "kcal left" : "kcal over"}
        </text>
      </svg>

      <ul className="grid w-full flex-1 gap-3">
        {RINGS.map((r) => {
          const v = Math.round(logged[r.key]);
          const t = targets[r.key];
          const over = v > t * 1.1;
          return (
            <li key={r.key} className="flex items-baseline gap-3">
              <span className="h-3 w-3 shrink-0 translate-y-[1px] rounded-full" style={{ background: r.color }} aria-hidden />
              <span className="w-16 text-sm text-ink2">{r.label}</span>
              <span className={`font-display text-xl font-bold tabular-nums ${over ? "text-over" : ""}`}>{v}</span>
              <span className="text-sm text-ink2 tabular-nums">/ {t} {r.unit}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
