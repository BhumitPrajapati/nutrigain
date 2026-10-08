"use client";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";

interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

/** Shows only where the browser offers a one-tap install (Chrome, Edge, Android). iPhone installs from Safari's Share menu instead. */
export default function InstallButton() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
    const on = (e: Event) => { e.preventDefault(); setEvt(e as InstallEvent); };
    const done = () => { setEvt(null); setInstalled(true); };
    window.addEventListener("beforeinstallprompt", on);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", on); window.removeEventListener("appinstalled", done); };
  }, []);
  if (!evt || installed) return null;
  return (
    <button className="btn-ghost" onClick={async () => { await evt.prompt(); await evt.userChoice; setEvt(null); }}>
      <Download size={14} aria-hidden /> Install app
    </button>
  );
}
