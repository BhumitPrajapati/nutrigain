"use client";
import { useNutriStore } from "@/lib/store";
import AuthScreen from "./AuthScreen";
import Dashboard from "./Dashboard";
import ProfileForm, { DEFAULT_PROFILE } from "./ProfileForm";

export default function App() {
  const store = useNutriStore();
  if (store.mode === "loading") return <div className="min-h-screen" aria-busy />;
  if (store.mode === "anon") {
    return <AuthScreen onLogin={store.login} onRegister={store.register} onDeviceOnly={store.useThisDeviceOnly} hasDeviceData={store.hasDeviceData} />;
  }
  if (!store.profile) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">
          Weigh it.<br />Log it.<br />Close the gap.
        </h1>
        <p className="mt-5 max-w-prose text-lg text-ink2">
          NutriGain sets a muscle-building calorie and protein target from your body, tracks food by the gram,
          and tells you exactly what to eat before bed to hit it.
        </p>
        <div className="panel mt-10 max-w-2xl p-5 sm:p-8">
          <h2 className="mb-5 font-display text-xl font-bold">Your numbers</h2>
          <ProfileForm initial={DEFAULT_PROFILE} onSave={store.saveProfile} submitLabel="Build my targets" />
        </div>
      </main>
    );
  }
  return <Dashboard store={store} profile={store.profile} />;
}
