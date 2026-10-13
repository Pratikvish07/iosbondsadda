import { toNumber } from './format';

/**
 * Readers for API records whose exact shape has not been confirmed. They try each candidate key
 * case-insensitively, so "DealId", "dealId" and "DEALID" all match. Keep candidates in order of
 * likelihood; once the backend documents a shape, move it into `store/api/types.ts`.
 */

function lookup(obj: unknown, keys: string[]): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const record = obj as Record<string, unknown>;
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== '') return record[key];
  }
  const lowered = new Map(Object.keys(record).map((k) => [k.toLowerCase(), k]));
  for (const key of keys) {
    const actual = lowered.get(key.toLowerCase());
    if (actual !== undefined) {
      const value = record[actual];
      if (value !== undefined && value !== null && value !== '') return value;
    }
  }
  return undefined;
}

export function pickString(obj: unknown, ...keys: string[]): string | undefined {
  const value = lookup(obj, keys);
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

export function pickNumber(obj: unknown, ...keys: string[]): number | undefined {
  return toNumber(lookup(obj, keys)) ?? undefined;
}

export function pickRecord(obj: unknown, ...keys: string[]): Record<string, unknown> | undefined {
  const value = lookup(obj, keys);
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function pickArray(obj: unknown, ...keys: string[]): unknown[] {
  const value = lookup(obj, keys);
  return Array.isArray(value) ? value : [];
}
