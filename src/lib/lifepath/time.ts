// Deterministic time helpers. Times are "HH:MM" strings on a 24h clock.

export const MINUTES_PER_DAY = 24 * 60;

export function parseTime(value: string | undefined | null): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec((value ?? "").trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

export function toTimeString(minutes: number): string {
  const m = ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** 360 -> "6:00 AM". Values outside a day wrap (e.g. -60 -> "11:00 PM"). */
export function formatClock(minutes: number | null): string {
  if (minutes == null || !Number.isFinite(minutes)) return "—";
  const m = ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h24 = Math.floor(m / 60);
  const mm = m % 60;
  const suffix = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${suffix}`;
}

export function formatClockString(value: string): string {
  return formatClock(parseTime(value));
}

/** 130 -> "2h 10m", 45 -> "45 min" */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Shift length in minutes; an end time at or before the start means an overnight shift. */
export function shiftLengthMinutes(start: string, end: string): number | null {
  const s = parseTime(start);
  const e = parseTime(end);
  if (s == null || e == null) return null;
  return e > s ? e - s : e + MINUTES_PER_DAY - s;
}

export function isOvernight(start: string, end: string): boolean {
  const s = parseTime(start);
  const e = parseTime(end);
  return s != null && e != null && e <= s;
}
