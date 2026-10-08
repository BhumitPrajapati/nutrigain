/** Pure date helpers (no browser APIs) so the server and tests can use them. */
export const shiftIsoPure = (iso: string, days: number): string => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Local calendar date, clock time and decimal hour for an instant in a given IANA time zone. */
export function localParts(now: Date, tz: string): { iso: string; hhmm: string; hour: number } {
  let parts: Record<string, string> = {};
  try {
    parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
        .formatToParts(now).map((p) => [p.type, p.value]));
  } catch {
    return localParts(now, "UTC");
  }
  const hh = parts.hour === "24" ? "00" : parts.hour;
  return { iso: `${parts.year}-${parts.month}-${parts.day}`, hhmm: `${hh}:${parts.minute}`, hour: Number(hh) + Number(parts.minute) / 60 };
};

export const toMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
