/** Night grid: 18:00 → 23:00 then 00:00 last (never lex first). */
export function nightSlotSortKey(startTime: string): number {
  if (startTime === '00:00') return 24;
  const [h, m] = startTime.split(':').map(Number);
  return (h || 0) + (m || 0) / 60;
}

export function sortNightSlots<T extends { startTime: string }>(slots: T[]): T[] {
  return [...slots].sort((a, b) => nightSlotSortKey(a.startTime) - nightSlotSortKey(b.startTime));
}

/** Approximate synodic month from a known new moon (2026-01-18 19:52 UTC). */
export function moonIllumination(dateIso: string): number {
  const t = Date.parse(`${dateIso}T12:00:00+02:00`);
  const knownNew = Date.parse('2026-01-18T19:52:00Z');
  const synodic = 29.530588853 * 24 * 3600 * 1000;
  const phase = ((t - knownNew) % synodic) / synodic;
  const p = phase < 0 ? phase + 1 : phase;
  return 0.5 * (1 - Math.cos(2 * Math.PI * p));
}

export function isFullMoon(dateIso: string): boolean {
  return moonIllumination(dateIso) >= 0.92;
}

export function monthOf(dateIso: string): number {
  const [y, m] = dateIso.split('-').map(Number);
  return m || 1;
}

export type VisibilityReason =
  | 'ok'
  | 'month'
  | 'full_moon'
  | 'altitude'
  | 'inactive';

export function evaluateVisibility(
  obj: {
    active: boolean;
    visibleMonths: number[];
    minAltitudeDeg: number;
    avoidFullMoon: boolean;
  },
  dateIso: string,
  assumedAltitudeDeg = 35,
): { visible: boolean; reason: VisibilityReason } {
  if (!obj.active) return { visible: false, reason: 'inactive' };
  const month = monthOf(dateIso);
  if (!obj.visibleMonths.includes(month)) return { visible: false, reason: 'month' };
  if (obj.avoidFullMoon && isFullMoon(dateIso)) return { visible: false, reason: 'full_moon' };
  if (assumedAltitudeDeg < obj.minAltitudeDeg) return { visible: false, reason: 'altitude' };
  return { visible: true, reason: 'ok' };
}

export const NIGHT_TIMES = ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'];

/** Madrid civil date YYYY-MM-DD */
export function madridDate(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function madridStartsAt(dateIso: string, startTime: string): Date {
  const hour = startTime === '00:00' ? 24 : Number(startTime.slice(0, 2));
  const [y, m, day] = dateIso.split('-').map(Number);
  // 00:00 is the last slot of the night → next calendar day 00:00 Madrid
  const base = new Date(Date.UTC(y, m - 1, day, 0, 0, 0));
  // Europe/Madrid CEST = UTC+2 in August
  const offsetHours = 2;
  if (startTime === '00:00') {
    return new Date(Date.UTC(y, m - 1, day + 1, 0 - offsetHours, 0, 0));
  }
  return new Date(Date.UTC(y, m - 1, day, hour - offsetHours, 0, 0));
}

export function addDaysIso(dateIso: string, days: number): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
