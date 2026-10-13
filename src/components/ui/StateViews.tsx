import { CircleAlert, Inbox } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { getErrorMessage } from '@/store/api/baseQuery';
import { colors } from '@/theme/colors';

import { Button } from './Button';

export function LoadingView({ label = 'Loading…' }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center py-16" accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.navy} />
      <Text className="mt-3 text-sm text-ink-muted">{label}</Text>
    </View>
  );
}

export function ErrorView({ error, onRetry, title = 'Unable to load' }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-16" accessibilityRole="alert">
      <CircleAlert size={40} color={colors.danger} />
      <Text className="mt-3 text-center text-base font-semibold text-ink">{title}</Text>
      <Text className="mt-1 text-center text-sm text-ink-muted">{getErrorMessage(error)}</Text>
      {onRetry ? <Button title="Try again" variant="outline" size="sm" onPress={onRetry} className="mt-5" /> : null}
    </View>
  );
}

export function EmptyView({
  title,
  message,
  icon,
  action,
}: {
  title: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <View className="items-center justify-center px-6 py-14">
      {icon ?? <Inbox size={40} color={colors.inkFaint} />}
      <Text className="mt-3 text-center text-base font-semibold text-ink">{title}</Text>
      {message ? <Text className="mt-1 text-center text-sm text-ink-muted">{message}</Text> : null}
      {action ? <View className="mt-5">{action}</View> : null}
    </View>
  );
}

/** Inline banner for form-level errors (e.g. "Invalid password"). */
export function ErrorBanner({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <View className="mb-4 flex-row items-start rounded-xl bg-danger-light px-4 py-3" accessibilityRole="alert">
      <CircleAlert size={18} color={colors.danger} />
      <Text className="ml-2 flex-1 text-sm text-danger">{message}</Text>
    </View>
  );
}
