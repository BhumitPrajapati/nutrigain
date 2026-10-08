"use client";
import { useMemo, useState } from "react";
import type { Activity, DietPref, Profile, Sex, SurplusMode } from "@/lib/types";
import { SURPLUS_KCAL, computeTargets } from "@/lib/engine";
import { AVOID_OPTIONS } from "@/lib/foodTags";

const ACTIVITY: [Activity, string][] = [
  ["sedentary", "Desk job, little exercise"],
  ["light", "Training 1-3 days a week"],
  ["moderate", "Training 3-5 days a week"],
  ["very_active", "Training 6-7 days a week"],
  ["extra_active", "Hard training plus a physical job"],
];

export const DEFAULT_PROFILE: Profile = {
  name: "", sex: "male", age: 25, heightCm: 175, weightKg: 70, activity: "moderate", surplus: "standard", diet: "omnivore", creatine: true, avoid: [],
};

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map(([v, text]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${value === v ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink hover:bg-paper"}`}>
          {text}
        </button>
      ))}
    </div>
  );
}

export default function ProfileForm({ initial, onSave, submitLabel, onCancel }: {
  initial: Profile; onSave: (p: Profile) => void; submitLabel: string; onCancel?: () => void;
}) {
  const [p, setP] = useState<Profile>(initial);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));
  const num = (k: "age" | "heightCm" | "weightKg") => (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value));
  const valid = p.age >= 14 && p.age <= 90 && p.heightCm >= 120 && p.heightCm <= 230 && p.weightKg >= 30 && p.weightKg <= 250;
  const t = useMemo(() => (valid ? computeTargets(p, p.creatine !== false) : null), [p, valid]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (valid) onSave({ ...p, name: p.name.trim() || "Athlete" }); }} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm text-ink2 sm:col-span-2">Name
          <input className="field" value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="Optional" />
        </label>
        <div className="grid gap-1.5 text-sm text-ink2 sm:col-span-2">Sex (used in the BMR formula)
          <Seg<Sex> label="Sex" value={p.sex} onChange={(v) => set("sex", v)} options={[["male", "Male"], ["female", "Female"]]} />
        </div>
        <label className="grid gap-1.5 text-sm text-ink2">Age
          <input className="field" type="number" inputMode="numeric" min={14} max={90} value={p.age} onChange={num("age")} />
        </label>
        <label className="grid gap-1.5 text-sm text-ink2">Height (cm)
          <input className="field" type="number" inputMode="decimal" min={120} max={230} value={p.heightCm} onChange={num("heightCm")} />
        </label>
        <label className="grid gap-1.5 text-sm text-ink2">Body weight (kg)
          <input className="field" type="number" inputMode="decimal" min={30} max={250} step="0.1" value={p.weightKg} onChange={num("weightKg")} />
        </label>
        <label className="grid gap-1.5 text-sm text-ink2">Activity
          <select className="field" value={p.activity} onChange={(e) => set("activity", e.target.value as Activity)}>
            {ACTIVITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-1.5 text-sm text-ink2">Muscle-gain pace
        <Seg<SurplusMode> label="Muscle-gain pace" value={p.surplus} onChange={(v) => set("surplus", v)}
          options={(Object.keys(SURPLUS_KCAL) as SurplusMode[]).map((k) => [k, `${k[0].toUpperCase()}${k.slice(1)} +${SURPLUS_KCAL[k]} kcal`] as [SurplusMode, string])} />
      </div>
      <div className="grid gap-1.5 text-sm text-ink2">Food preference for suggestions
        <Seg<DietPref> label="Food preference" value={p.diet} onChange={(v) => set("diet", v)} options={[["omnivore", "Anything"], ["vegetarian", "Vegetarian"], ["vegan", "Vegan"]]} />
      </div>
      <fieldset className="grid gap-1.5 text-sm text-ink2">
        <legend>Never suggest (allergies and dislikes)</legend>
        <div className="mt-1 flex flex-wrap gap-x-5 gap-y-2">
          {AVOID_OPTIONS.map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-base text-ink">
              <input type="checkbox" className="h-5 w-5 accent-protein" checked={(p.avoid ?? []).includes(o.id)}
                onChange={(e) => set("avoid", e.target.checked ? [...(p.avoid ?? []), o.id] : (p.avoid ?? []).filter((x) => x !== o.id))} />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-base">
        <input type="checkbox" className="h-5 w-5 accent-protein" checked={p.creatine !== false} onChange={(e) => set("creatine", e.target.checked)} />
        I take creatine (raises the water target by 500 mL)
      </label>

      {t ? (
        <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-ink p-4 text-paper sm:grid-cols-4" aria-live="polite">
          {[["BMR", `${t.bmr} kcal`], ["TDEE", `${t.tdee} kcal`], ["Daily target", `${t.kcal} kcal`], ["Protein", `${t.proteinG} g`],
            ["Carbs", `${t.carbsG} g`], ["Fat", `${t.fatG} g`], ["Fiber", `${t.fiberG} g`], ["Water", `${(t.waterMl / 1000).toFixed(1)} L`]].map(([k, v]) => (
            <div key={k}><dt className="text-xs text-paper/70">{k}</dt><dd className="font-display text-xl font-bold tabular-nums">{v}</dd></div>
          ))}
        </dl>
      ) : <p className="text-over">Check age (14-90), height (120-230 cm) and weight (30-250 kg).</p>}

      <div className="flex gap-3">
        <button className="btn-ink px-6 py-3 text-base" disabled={!valid}>{submitLabel}</button>
        {onCancel && <button type="button" className="btn-ghost px-6 py-3 text-base" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
