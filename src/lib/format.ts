import { API_ORIGIN } from '@/config/env';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrPrecise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[₹,%\s]/g, '');
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function formatCurrency(value: unknown, precise = false): string {
  const n = toNumber(value);
  if (n === null) return '—';
  return (precise ? inrPrecise : inr).format(n);
}

export function formatPercent(value: unknown): string {
  const n = toNumber(value);
  return n === null ? '—' : `${n.toFixed(2)}%`;
}

/** Parses the API's dd/MM/yyyy dates. Returns null for anything else. */
export function parseApiDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(value.trim());
  if (!match) return null;
  const d = Number(match[1]);
  const m = Number(match[2]);
  const y = Number(match[3]);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

/** Formats a Date as dd/MM/yyyy, the format every API endpoint expects. */
export function toApiDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
}

const displayDate = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const displayMonth = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' });

export function formatDate(value: unknown): string {
  const date = value instanceof Date ? value : parseApiDate(value);
  if (date) return displayDate.format(date);
  return typeof value === 'string' && value.trim() ? value : '—';
}

export function formatMonthYear(value: unknown): string {
  const date = value instanceof Date ? value : parseApiDate(value);
  if (date) return displayMonth.format(date);
  return typeof value === 'string' && value.trim() ? value : '—';
}

export function resolveAssetUrl(path: unknown): string | null {
  if (typeof path !== 'string' || !path.trim()) return null;
  const p = path.trim();
  if (/^https:\/\//i.test(p)) return p;
  if (/^http:\/\//i.test(p)) return p.replace(/^http:/i, 'https:');
  return `${API_ORIGIN}${p.startsWith('/') ? '' : '/'}${p}`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '?';
}

/** Shows only the last `visible` characters of an identifier, e.g. Aadhaar or account numbers. */
export function maskTail(value: string | null | undefined, visible = 4): string {
  if (!value) return '—';
  const v = value.replace(/\s/g, '');
  if (v.length <= visible) return v;
  return `${'•'.repeat(Math.min(v.length - visible, 8))}${v.slice(-visible)}`;
}

/** Normalizes server strings, which often carry trailing spaces ("Bank bonds "). */
export function clean(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value == null) return '';
  return String(value);
}
