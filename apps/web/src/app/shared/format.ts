import { SKY_LABELS, STATUS_LABELS, TYPE_LABELS } from './models';
import type { BookingStatus } from './models';

export function eur(cents: number | null | undefined): string {
  const n = (cents ?? 0) / 100;
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = iso.length <= 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = iso.length <= 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
  }).format(d);
}

export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function addDaysISO(base: string, days: number): string {
  const d = new Date(base + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function statusLabel(s: BookingStatus | string): string {
  return STATUS_LABELS[s] || s;
}

export function skyLabel(s: string): string {
  return SKY_LABELS[s] || s;
}

export function typeLabel(s: string): string {
  return TYPE_LABELS[s] || s;
}

export function statusBadgeClass(s: BookingStatus | string): string {
  switch (s) {
    case 'confirmed':
    case 'checked_in':
      return 'badge badge-success';
    case 'pending':
      return 'badge badge-warning';
    case 'completed':
      return 'badge badge-primary';
    case 'cancelled':
    case 'expired':
      return 'badge badge-danger';
    default:
      return 'badge';
  }
}

export function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function nightSlotSortKey(startTime: string): number {
  const [hRaw, mRaw] = String(startTime || '00:00').split(':');
  const hh = Number(hRaw) || 0;
  const mm = Number(mRaw) || 0;
  return (hh < 12 ? hh + 24 : hh) * 60 + mm;
}

export function sortNightSlots<T extends { startTime: string }>(slots: T[]): T[] {
  return [...slots].sort((a, b) => nightSlotSortKey(a.startTime) - nightSlotSortKey(b.startTime));
}

export function httpMessage(err: unknown, fallback: string): string {
  const e = err as { error?: { message?: string; code?: string }; message?: string };
  if (e?.error?.message) return e.error.message;
  if (e?.message) return e.message;
  return fallback;
}

export function conflictCode(err: unknown): string {
  const e = err as { error?: { code?: string }; status?: number };
  return e?.error?.code || '';
}

export abstract class FormatBase {
  readonly eur = eur;
  readonly formatDate = formatDate;
  readonly formatDateShort = formatDateShort;
  readonly statusLabel = statusLabel;
  readonly skyLabel = skyLabel;
  readonly typeLabel = typeLabel;
  readonly statusBadgeClass = statusBadgeClass;
  readonly mmss = mmss;
}
