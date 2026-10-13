import { Text, View } from 'react-native';

import { Divider } from '@/components/ui/Card';
import { formatCurrency, formatDate, parseApiDate, toNumber } from '@/lib/format';

const CURRENCY_KEY = /(amount|value|interest|consideration|duty|principal|invested|total|gross|paid|payable)$/i;
const NON_CURRENCY_KEY = /(id|qty|quantity|days|rate|price|percent|ytm|count|no|number)$/i;
const SECRET_KEY = /(password|token|secret|base64|hash|otp)/i;

/** "DealConfirmationId" -> "Deal Confirmation Id"; "IFSCCode" -> "IFSC Code". */
export function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

export function formatField(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return null;
  if (/date/i.test(key) && parseApiDate(value)) return formatDate(value);
  if (CURRENCY_KEY.test(key) && !NON_CURRENCY_KEY.test(key) && toNumber(value) !== null) {
    return formatCurrency(value, true);
  }
  return String(value).trim() || null;
}

/**
 * Renders the scalar fields of an API record as label/value rows. Used for responses whose shape is
 * not yet contractually fixed, so new server fields appear without an app release.
 */
export function RecordDetails({
  record,
  exclude = [],
  order = [],
}: {
  record: Record<string, unknown> | null | undefined;
  exclude?: string[];
  /** Keys to show first, in this order. */
  order?: string[];
}) {
  if (!record) return null;
  const skip = new Set(exclude.map((k) => k.toLowerCase()));
  const keys = Object.keys(record).filter((k) => !skip.has(k.toLowerCase()) && !SECRET_KEY.test(k));
  const rank = (k: string) => {
    const i = order.findIndex((o) => o.toLowerCase() === k.toLowerCase());
    return i === -1 ? order.length : i;
  };
  const rows = keys
    .sort((a, b) => rank(a) - rank(b))
    .map((k) => [k, formatField(k, record[k])] as const)
    .filter((row): row is readonly [string, string] => row[1] !== null);

  if (!rows.length) return null;
  return (
    <View>
      {rows.map(([key, value], i) => (
        <View key={key}>
          {i > 0 ? <Divider /> : null}
          <View className="flex-row justify-between py-2.5">
            <Text className="flex-1 pr-3 text-ink-muted">{humanizeKey(key)}</Text>
            <Text className="max-w-[60%] text-right font-semibold text-ink">{value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
