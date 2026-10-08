"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { AVOID_OPTIONS } from "@/lib/foodTags";
import type { Diet, Food } from "@/lib/types";

const newId = () => `c_${(Math.random().toString(36) + "00000000").slice(2, 10)}`;
const n = (s: string) => (s.trim() === "" ? NaN : Number(s));
const r1 = (x: number) => Math.round(x * 10) / 10;
const show = (x: number) => String(r1(x));

export default function FoodForm({ initial, onSave, onClose }: { initial?: Food; onSave: (f: Food) => void; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [per, setPer] = useState<"100g" | "serving">("100g");
  const [serving, setServing] = useState(initial ? String(initial.servingG) : "100");
  const [servingName, setServingName] = useState(initial && initial.servingLabel !== `${initial.servingG} g` ? initial.servingLabel : "");
  const [v, setV] = useState({
    kcal: initial ? show(initial.kcal) : "", proteinG: initial ? show(initial.proteinG) : "", carbsG: initial ? show(initial.carbsG) : "", fatG: initial ? show(initial.fatG) : "",
    fiberG: initial?.fiberG ? show(initial.fiberG) : "", calciumMg: initial?.calciumMg ? show(initial.calciumMg) : "", ironMg: initial?.ironMg ? show(initial.ironMg) : "", potassiumMg: initial?.potassiumMg ? show(initial.potassiumMg) : "",
  });
  const [diet, setDiet] = useState<Diet>(initial?.diet ?? "o");
  const [contains, setContains] = useState<string[]>(initial?.contains ?? []);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => { first.current?.focus(); const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);

  const sg = n(serving);
  const factor = per === "serving" && sg > 0 ? 100 / sg : 1;
  const p100 = useMemo(() => {
    const o: Record<string, number> = {};
    for (const [k, val] of Object.entries(v)) o[k] = (Number.isNaN(n(val)) ? 0 : n(val)) * factor;
    return o;
  }, [v, factor]);

  const errors: string[] = [];
  if (!name.trim()) errors.push("Enter a name.");
  for (const k of ["kcal", "proteinG", "carbsG", "fatG"] as const) if (Number.isNaN(n(v[k])) || n(v[k]) < 0) errors.push(`Enter ${k === "kcal" ? "calories" : k.replace("G", "")} (0 or more).`);
  if (!(sg >= 1 && sg <= 2000)) errors.push("Serving size must be 1 to 2000 g.");
  const macroG = p100.proteinG + p100.carbsG + p100.fatG;
  if (macroG > 100.5) errors.push(`Protein, carbs and fat add up to ${show(macroG)} g per 100 g, which is more than the food weighs. Check whether the label is per serving.`);
  if (p100.kcal > 900) errors.push("Calories per 100 g cannot be above 900.");

  const est = 4 * p100.proteinG + 4 * p100.carbsG + 9 * p100.fatG;
  const mismatch = errors.length === 0 && Math.abs(p100.kcal - est) > Math.max(30, est * 0.2);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (errors.length) return;
    const g = Math.round(sg * 10) / 10;
    onSave({
      id: initial?.id ?? newId(), name: name.trim(), category: "custom", custom: true, diet, contains,
      kcal: r1(p100.kcal), proteinG: r1(p100.proteinG), carbsG: r1(p100.carbsG), fatG: r1(p100.fatG),
      fiberG: r1(p100.fiberG), calciumMg: r1(p100.calciumMg), ironMg: r1(p100.ironMg), potassiumMg: r1(p100.potassiumMg),
      servingG: g, servingLabel: servingName.trim() ? `${servingName.trim()} (${g} g)` : `${g} g`,
      minG: Math.max(1, Math.round(g * 0.5)), maxG: Math.min(2000, Math.round(g * 3)),
    });
  };

  const num = (k: keyof typeof v, label: string, unit: string, ref?: React.Ref<HTMLInputElement>) => (
    <label className="grid gap-1 text-sm text-ink2">{label} ({unit})
      <input ref={ref} className="field" inputMode="decimal" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value.replace(/[^0-9.]/g, "") })} />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form role="dialog" aria-modal="true" aria-labelledby="ff-h" onSubmit={submit}
        className="max-h-[92vh] w-full max-w-xl overflow-auto rounded-t-3xl bg-panel p-5 text-ink sm:rounded-3xl sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <h2 id="ff-h" className="font-display text-2xl font-bold">{initial ? "Edit food" : "Add your own food"}</h2>
          <button type="button" className="rounded-full p-2 hover:bg-paper" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="mt-4 grid gap-4">
          <label className="grid gap-1 text-sm text-ink2">Name
            <input ref={first} className="field" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mom's lentil dal" />
          </label>

          <div className="grid gap-1.5 text-sm text-ink2">The label shows values for
            <div role="radiogroup" aria-label="Values are per" className="flex gap-2">
              {([["100g", "100 g"], ["serving", "One serving"]] as const).map(([k, t]) => (
                <button key={k} type="button" role="radio" aria-checked={per === k} onClick={() => setPer(k)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${per === k ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink"}`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm text-ink2">{per === "serving" ? "Serving size (g)" : "Typical portion (g)"}
              <input className="field" inputMode="decimal" value={serving} onChange={(e) => setServing(e.target.value.replace(/[^0-9.]/g, ""))} />
            </label>
            <label className="grid gap-1 text-sm text-ink2">Portion name (optional)
              <input className="field" value={servingName} maxLength={25} onChange={(e) => setServingName(e.target.value)} placeholder="1 bar, 1 bowl" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {num("kcal", "Calories", "kcal")}{num("proteinG", "Protein", "g")}{num("carbsG", "Carbs", "g")}{num("fatG", "Fat", "g")}{num("fiberG", "Fiber", "g")}
          </div>
          <details className="rounded-xl border border-line p-3">
            <summary className="cursor-pointer font-semibold">More nutrients (optional)</summary>
            <div className="mt-3 grid grid-cols-2 gap-3">{num("calciumMg", "Calcium", "mg")}{num("ironMg", "Iron", "mg")}{num("potassiumMg", "Potassium", "mg")}</div>
            <p className="mt-2 text-sm text-ink2">These feed the low-micronutrient suggestions and reminders.</p>
          </details>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm text-ink2">Fits which diets
              <select className="field" value={diet} onChange={(e) => setDiet(e.target.value as Diet)}>
                <option value="o">Contains meat or fish</option><option value="vg">Vegetarian</option><option value="v">Vegan</option>
              </select>
            </label>
            <fieldset className="text-sm text-ink2">
              <legend>Contains (so it is skipped when you avoid it)</legend>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {AVOID_OPTIONS.map((o) => (
                  <label key={o.id} className="flex items-center gap-1.5 text-ink">
                    <input type="checkbox" className="accent-protein" checked={contains.includes(o.id)} onChange={(e) => setContains(e.target.checked ? [...contains, o.id] : contains.filter((x) => x !== o.id))} />{o.label}
                  </label>))}
              </div>
            </fieldset>
          </div>

          {per === "serving" && errors.length === 0 && (
            <p className="rounded-xl bg-surface px-3 py-2 text-sm tabular-nums">Saved per 100 g: {show(p100.kcal)} kcal, {show(p100.proteinG)} g protein, {show(p100.carbsG)} g carbs, {show(p100.fatG)} g fat, {show(p100.fiberG)} g fiber.</p>
          )}
          {mismatch && <p role="status" className="rounded-xl bg-carbs/25 px-3 py-2 text-sm">Those macros add up to about {Math.round(est)} kcal per 100 g, but you entered {Math.round(p100.kcal)}. You can still save, but check the label.</p>}
          {errors.length > 0 && name !== "" && <ul role="alert" className="rounded-xl bg-over px-3 py-2 text-sm text-onaccent">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
          <div className="flex gap-3">
            <button className="btn-ink px-6 py-3 text-base" disabled={errors.length > 0}>{initial ? "Save changes" : "Save food"}</button>
            <button type="button" className="btn-ghost px-6 py-3 text-base" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </form>
    </div>
  );
}
