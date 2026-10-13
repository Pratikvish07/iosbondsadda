import { router } from 'expo-router';
import { Receipt } from 'lucide-react-native';
import { FlatList, Pressable, Text, View } from 'react-native';

import { StatusBadge } from '@/components/ui/Badge';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/StateViews';
import { pickNumber, pickString } from '@/lib/fields';
import { formatCurrency, formatDate } from '@/lib/format';
import { usePaymentsQuery } from '@/store/api/bondsAddaApi';
import { useCustomerId } from '@/store/hooks';
import { colors } from '@/theme/colors';

export default function PaymentHistoryScreen() {
  const customerId = useCustomerId();
  const { data, error, isLoading, isFetching, refetch } = usePaymentsQuery({ customerId });

  return (
    <Screen scroll={false} header={<ScreenHeader title="Payment History" />} contentClassName="">
      {isLoading ? (
        <LoadingView />
      ) : error && !data ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(p, i) => pickString(p, 'PaymentId', 'OrderId', 'Id', 'DealId') ?? String(i)}
          refreshing={isFetching}
          onRefresh={refetch}
          renderItem={({ item }) => {
            const dealId = pickString(item, 'DealConfirmationId', 'DealId');
            const productId = pickString(item, 'ProductId') ?? '';
            return (
              <Pressable
                disabled={!dealId}
                onPress={() => dealId && router.push({ pathname: '/deals/[id]', params: { id: dealId, productId } })}
                accessibilityRole="button"
                className="border-b border-line px-5 py-4 active:bg-surface"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="font-bold text-ink">
                      {pickString(item, 'ProductName', 'Description') ?? `Deal #${dealId ?? '—'}`}
                    </Text>
                    <Text className="text-xs text-ink-muted">
                      {formatDate(pickString(item, 'PaymentDate', 'CreatedDate', 'Date'))}
                      {pickString(item, 'OrderId', 'TransactionId')
                        ? ` · Ref ${pickString(item, 'OrderId', 'TransactionId')}`
                        : ''}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="font-bold text-ink">
                      {formatCurrency(pickNumber(item, 'Amount', 'PaidAmount', 'TotalAmount'), true)}
                    </Text>
                    <View className="mt-1">
                      <StatusBadge status={pickString(item, 'Status', 'PaymentStatus')} fallback="Pending" />
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <EmptyView
              icon={<Receipt size={40} color={colors.inkFaint} />}
              title="No payments yet"
              message="Payments for your deals will appear here."
            />
          }
        />
      )}
    </Screen>
  );
}
