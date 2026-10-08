"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  const flip = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("ng-theme", next ? "dark" : "light"); } catch { /* ignore */ }
  };
  return (
    <button className="btn-ghost" onClick={flip} aria-pressed={dark} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
      {dark ? <Sun size={14} aria-hidden /> : <Moon size={14} aria-hidden />}
      <span className="hidden sm:inline">{dark ? "Light" : "Dark"}</span>
    </button>
  );
}
