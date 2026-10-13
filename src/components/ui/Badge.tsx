import { Text, View } from 'react-native';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const toneClass: Record<BadgeTone, { box: string; text: string }> = {
  success: { box: 'bg-success-light', text: 'text-success-dark' },
  warning: { box: 'bg-warning-light', text: 'text-warning' },
  danger: { box: 'bg-danger-light', text: 'text-danger' },
  info: { box: 'bg-blue-50', text: 'text-brand-blue' },
  neutral: { box: 'bg-surface', text: 'text-ink-muted' },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const t = toneClass[tone];
  return (
    <View className={`self-start rounded-md px-2 py-0.5 ${t.box}`}>
      <Text className={`text-xs font-semibold ${t.text}`}>{label}</Text>
    </View>
  );
}

/** Maps the free-text statuses the API returns (Pending, Verified, Paid, Rejected…) to a tone. */
export function statusTone(status: string | null | undefined): BadgeTone {
  const s = (status ?? '').toLowerCase();
  if (/(verified|approved|confirmed|completed|success|paid|captured|active)/.test(s)) return 'success';
  if (/(reject|fail|cancel|declin|expired|invalid)/.test(s)) return 'danger';
  if (/(pending|process|review|submitted|initiated|created|awaiting)/.test(s)) return 'warning';
  return 'neutral';
}

export function StatusBadge({ status, fallback = 'Not submitted' }: { status: string | null | undefined; fallback?: string }) {
  const label = status?.trim() || fallback;
  return <Badge label={label} tone={status ? statusTone(status) : 'neutral'} />;
}
