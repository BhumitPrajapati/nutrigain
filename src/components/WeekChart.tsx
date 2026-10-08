"use client";
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface WeekPoint { label: string; kcalPct: number; proteinPct: number; logged: boolean }

export default function WeekChart({ data, streak }: { data: WeekPoint[]; streak: number }) {
  const any = data.some((d) => d.logged);
  return (
    <section className="panel p-5" aria-labelledby="week-h">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="week-h" className="font-display text-lg font-bold">Last 7 days</h2>
        <p className="text-sm text-ink2"><span className="font-display text-xl font-bold text-ink tabular-nums">{streak}</span> day streak on target</p>
      </div>
      {!any ? (
        <p className="mt-3 text-ink2">Log a day of food and your week shows up here as a share of each target.</p>
      ) : (
        <div className="mt-4 h-52" role="img" aria-label="Bar chart of calories and protein as a percent of target for the last seven days">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barGap={3}>
              <CartesianGrid vertical={false} stroke="rgb(var(--line))" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "rgb(var(--ink2))", fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "rgb(var(--ink2))", fontSize: 12 }} unit="%" domain={[0, 150]} ticks={[0, 50, 100, 150]} />
              <ReferenceLine y={100} stroke="rgb(var(--ink))" strokeDasharray="4 3" />
              <Tooltip formatter={(v) => `${v}%`} cursor={{ fill: "rgb(var(--ink) / 0.08)" }} contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--line))", borderRadius: 12, color: "rgb(var(--ink))" }} labelStyle={{ color: "rgb(var(--ink))" }} itemStyle={{ color: "rgb(var(--ink))" }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "rgb(var(--ink2))" }} />
              <Bar dataKey="kcalPct" name="Calories" fill="rgb(var(--ink))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="proteinPct" name="Protein" fill="rgb(var(--protein))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
