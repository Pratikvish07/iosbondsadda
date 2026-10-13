import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { RecordDetails } from '@/components/RecordDetails';
import { Card, Divider } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '@/components/ui/StateViews';
import { pickArray, pickRecord, pickString } from '@/lib/fields';
import { formatCurrency, formatDate } from '@/lib/format';
import { useCashFlowDetailQuery } from '@/store/api/bondsAddaApi';
import { useCustomerId } from '@/store/hooks';

export default function CashFlowDetailScreen() {
  const { id, productId = '' } = useLocalSearchParams<{ id: string; productId?: string }>();
  const customerId = useCustomerId();
  const { data, error, isLoading, isFetching, refetch } = useCashFlowDetailQuery({
    cashFlowId: id,
    customerId,
    productId,
  });

  if (isLoading) return <LoadingView />;
  if (!data) return <ErrorView error={error} onRetry={refetch} />;

  const summary = pickRecord(data, 'CashFlow', 'Header') ?? data;
  const schedule = pickArray(data, 'Schedule', 'Items', 'Details', 'Rows');

  return (
    <Screen header={<ScreenHeader title="Saved Cash Flow" />} refreshing={isFetching} onRefresh={refetch}>
      <Card className="mt-2 py-1">
        <RecordDetails record={summary} exclude={['CustomerId', 'Schedule', 'Items', 'Details', 'Rows']} />
      </Card>

      {schedule.length ? (
        <>
          <Text className="mb-2 mt-6 text-lg font-bold text-ink">Schedule</Text>
          <Card className="px-3 py-1">
            {schedule.map((row, i) => (
              <View key={i}>
                {i > 0 ? <Divider /> : null}
                <View className="flex-row justify-between py-2.5">
                  <Text className="text-ink">{formatDate(pickString(row, 'InterestDate', 'Date'))}</Text>
                  <Text className="font-semibold text-ink">
                    {formatCurrency(pickString(row, 'InterestValue', 'Amount', 'Interest'), true)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
