import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

export function Card({
  children,
  onPress,
  className = '',
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
  accessibilityLabel?: string;
}) {
  const base = `rounded-2xl border border-line bg-white p-4 ${className}`;
  if (!onPress) return <View className={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={`${base} active:bg-surface`}
    >
      {children}
    </Pressable>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View className="mb-3 mt-6 flex-row items-center justify-between">
      <Text className="text-lg font-bold text-ink" accessibilityRole="header">
        {title}
      </Text>
      {action}
    </View>
  );
}

/** Label/value pair used in summary tables. */
export function InfoRow({
  label,
  value,
  emphasis = false,
  valueClassName = '',
}: {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
  valueClassName?: string;
}) {
  return (
    <View className="flex-row items-center justify-between py-2.5">
      <Text className={`flex-1 pr-3 ${emphasis ? 'font-bold text-ink' : 'text-ink-muted'}`}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text className={`${emphasis ? 'text-base font-bold' : 'font-semibold'} text-ink ${valueClassName}`}>
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}

/** Small boxed statistic used on bond detail and portfolio screens. */
export function StatTile({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <View className={`flex-1 rounded-xl border border-line bg-surface px-3 py-3 ${className}`}>
      <Text className="text-xs text-ink-muted">{label}</Text>
      <Text className="mt-1 text-sm font-semibold text-ink" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function Divider({ className = '' }: { className?: string }) {
  return <View className={`h-px bg-line ${className}`} />;
}
