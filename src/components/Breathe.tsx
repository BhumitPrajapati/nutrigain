"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";

const PATTERNS = {
  box: { name: "Box breathing", note: "In 4, hold 4, out 4, hold 4. Steadies you before a hard set or a stressful call.", steps: [["Breathe in", 4], ["Hold", 4], ["Breathe out", 4], ["Hold", 4]] },
  relax: { name: "4-7-8", note: "In 4, hold 7, out 8. A slow exhale that helps you wind down before bed.", steps: [["Breathe in", 4], ["Hold", 7], ["Breathe out", 8]] },
  calm: { name: "Even breathing", note: "In 5, out 5. The simplest way to slow down.", steps: [["Breathe in", 5], ["Breathe out", 5]] },
} as const;
type Key = keyof typeof PATTERNS;

export default function Breathe({ minutesToday, onDone }: { minutesToday: number; onDone: (minutes: number) => void }) {
  const [key, setKey] = useState<Key>("box");
  const [mins, setMins] = useState(3);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [reduced, setReduced] = useState(false);
  const startRef = useRef(0);
  useEffect(() => { setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);

  const steps = PATTERNS[key].steps as unknown as [string, number][];
  const cycle = steps.reduce((a, s) => a + s[1], 0);

  useEffect(() => {
    if (!running) return;
    startRef.current = Date.now() - elapsed * 1000;
    const id = setInterval(() => {
      const e = (Date.now() - startRef.current) / 1000;
      if (e >= mins * 60) { setRunning(false); setElapsed(0); onDone(mins); } else setElapsed(e);
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mins]);

  const stop = () => {
    setRunning(false);
    const whole = Math.floor(elapsed / 60);
    if (whole >= 1) onDone(whole);
    setElapsed(0);
  };

  let label = "Ready", left = 0, scale = 0.6;
  if (running) {
    let t = elapsed % cycle;
    let prev = steps[steps.length - 1][0];
    for (const [name, secs] of steps) {
      if (t < secs) { label = name; left = Math.ceil(secs - t); break; }
      t -= secs; prev = name;
    }
    // inhale grows the circle, exhale shrinks it, and a hold keeps whatever size it had
    scale = label === "Breathe in" ? 1 : label === "Breathe out" ? 0.6 : prev === "Breathe out" ? 0.6 : 1;
  }
  const dur = running ? (steps.find(([n]) => n === label)?.[1] ?? 1) : 0.4;

  return (
    <section className="panel p-5 sm:p-6" aria-labelledby="br-h">
      <h2 id="br-h" className="font-display text-xl font-bold">Breathe</h2>
      <p className="text-ink2">{minutesToday > 0 ? `${minutesToday} mindful minute${minutesToday === 1 ? "" : "s"} today.` : "A few slow breaths lower tension fast."}</p>
      <div className="mt-4 grid gap-5">
        <div className="grid gap-3">
          <div role="radiogroup" aria-label="Pattern" className="grid gap-2">
            {(Object.keys(PATTERNS) as Key[]).map((k) => (
              <button key={k} role="radio" aria-checked={key === k} disabled={running} onClick={() => setKey(k)}
                className={`rounded-xl border px-4 py-3 text-left ${key === k ? "border-ink bg-ink text-paper" : "border-line bg-surface hover:bg-paper"} disabled:opacity-60`}>
                <span className="block font-semibold">{PATTERNS[k].name}</span>
                <span className={`block text-sm ${key === k ? "text-paper/80" : "text-ink2"}`}>{PATTERNS[k].note}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {[1, 3, 5].map((m) => (
              <button key={m} disabled={running} onClick={() => setMins(m)} aria-pressed={mins === m}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold ${mins === m ? "border-ink bg-ink text-paper" : "border-line bg-surface"} disabled:opacity-60`}>{m} min</button>
            ))}
            {running
              ? <button className="btn-ghost ml-auto" onClick={stop}><Square size={14} aria-hidden /> Stop</button>
              : <button className="btn-ink ml-auto" onClick={() => setRunning(true)}><Play size={14} aria-hidden /> Start</button>}
          </div>
        </div>
        <div className="order-first flex flex-col items-center justify-center gap-2">
          <div className="grid h-40 w-40 place-items-center">
            <div className="grid place-items-center rounded-full bg-water/30 ring-4 ring-water/60"
              style={{ width: `${(reduced ? 1 : scale) * 100}%`, height: `${(reduced ? 1 : scale) * 100}%`, transition: reduced ? "none" : `all ${dur}s ease-in-out` }}>
              <span className="font-display text-3xl font-bold tabular-nums" aria-hidden>{running ? left : ""}</span>
            </div>
          </div>
          <p role="status" aria-live="polite" className="font-display text-xl font-bold">{label}</p>
        </div>
      </div>
    </section>
  );
}
