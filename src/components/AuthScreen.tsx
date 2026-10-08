"use client";
import { useState } from "react";

export default function AuthScreen({ onLogin, onRegister, onDeviceOnly, hasDeviceData }: {
  onLogin: (e: string, p: string) => Promise<string | null>;
  onRegister: (e: string, p: string) => Promise<string | null>;
  onDeviceOnly: () => void;
  hasDeviceData: boolean;
}) {
  const [tab, setTab] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    const msg = await (tab === "register" ? onRegister : onLogin)(email, password);
    if (msg) { setError(msg); setBusy(false); }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">
        Weigh it.<br />Log it.<br />Close the gap.
      </h1>
      <p className="mt-5 max-w-prose text-lg text-ink2">
        Create an account and your profile, food logs, water and supplements are saved to a database, so they follow you to every device.
      </p>

      <div className="panel mt-10 max-w-md p-5 sm:p-8">
        <div role="tablist" aria-label="Account" className="mb-5 flex gap-2">
          {([["register", "Create account"], ["login", "Sign in"]] as const).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setError(""); }}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${tab === k ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink hover:bg-paper"}`}>
              {label}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="grid gap-4">
          <label className="grid gap-1.5 text-sm text-ink2">Email
            <input className="field" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm text-ink2"><span>Password{tab === "register" ? " (8 characters or more)" : ""}</span>
            <input className="field" type="password" required minLength={tab === "register" ? 8 : 1} autoComplete={tab === "register" ? "new-password" : "current-password"}
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p role="alert" className="rounded-xl bg-over px-3 py-2 text-sm text-onaccent">{error}</p>}
          <button className="btn-ink px-6 py-3 text-base" disabled={busy}>{busy ? "One moment…" : tab === "register" ? "Create account" : "Sign in"}</button>
        </form>
        {hasDeviceData && <p className="mt-4 text-sm text-ink2">Your logs saved on this device will be moved into a new account.</p>}
        <button className="mt-5 text-sm font-semibold underline underline-offset-4" onClick={onDeviceOnly}>
          Keep using this device only
        </button>
      </div>
    </main>
  );
}
