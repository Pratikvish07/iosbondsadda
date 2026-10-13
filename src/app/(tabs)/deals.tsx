import { router } from 'expo-router';
import { Handshake } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { statusTone, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/StateViews';
import { PillTabs } from '@/components/ui/Tabs';
import { pickNumber, pickString } from '@/lib/fields';
import { formatCurrency, formatDate } from '@/lib/format';
import type { ApiRecord } from '@/store/api/types';
import { useDealsQuery } from '@/store/api/bondsAddaApi';
import { useCustomerId } from '@/store/hooks';
import { colors } from '@/theme/colors';

type Filter = 'all' | 'pending' | 'confirmed' | 'completed';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
];

function dealStatus(deal: ApiRecord) {
  return pickString(deal, 'Status', 'DealStatus', 'PaymentStatus') ?? 'Pending';
}

function matches(filter: Filter, status: string) {
  if (filter === 'all') return true;
  const s = status.toLowerCase();
  if (filter === 'completed') return /(complete|settled|paid)/.test(s);
  if (filter === 'confirmed') return /confirm/.test(s);
  return statusTone(status) === 'warning' || statusTone(status) === 'neutral';
}

function DealRow({ deal }: { deal: ApiRecord }) {
  const id = pickString(deal, 'DealConfirmationId', 'DealConfirmationID', 'DealId', 'Id');
  const productId = pickString(deal, 'ProductId') ?? '';
  const status = dealStatus(deal);
  const amount = pickNumber(deal, 'ConsiderationStamp', 'TotalConsideration', 'GrossConsideration', 'TotalAmount', 'Amount');

  return (
    <Pressable
      disabled={!id}
      onPress={() => id && router.push({ pathname: '/deals/[id]', params: { id, productId } })}
      accessibilityRole="button"
      className="border-b border-line bg-white px-5 py-4 active:bg-surface"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="font-bold text-ink">Deal #{id ?? '—'}</Text>
          <Text className="text-sm text-ink" numberOfLines={1}>
            {pickString(deal, 'ProductName', 'Security', 'BondName') ?? 'Bond'}
          </Text>
        </View>
        <StatusBadge status={status} />
      </View>
      <View className="mt-2 flex-row items-end justify-between">
        <Text className="text-xs text-ink-muted">
          Qty: {pickString(deal, 'Quantity', 'Qty') ?? '—'} · Rate: {pickString(deal, 'Rate', 'Price') ?? '—'}
          {'\n'}
          {formatDate(pickString(deal, 'DealDate', 'CreatedDate', 'CreatedOn'))}
        </Text>
        <Text className="text-base font-bold text-ink">{amount !== undefined ? formatCurrency(amount) : ''}</Text>
      </View>
    </Pressable>
  );
}

export default function DealsScreen() {
  const customerId = useCustomerId();
  const [filter, setFilter] = useState<Filter>('all');
  const { data, error, isLoading, isFetching, refetch } = useDealsQuery({ customerId });

  const deals = useMemo(() => (data?.Items ?? []).filter((d) => matches(filter, dealStatus(d))), [data, filter]);

  return (
    <Screen scroll={false} insetBottom={false} header={<ScreenHeader title="Deals" showBack={false} />} contentClassName="">
      <View className="pb-2">
        <PillTabs options={FILTERS} value={filter} onChange={setFilter} />
      </View>
      {isLoading ? (
        <LoadingView label="Loading deals…" />
      ) : error && !data ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : (
        <FlatList
          data={deals}
          keyExtractor={(d, i) => pickString(d, 'DealConfirmationId', 'DealId', 'Id') ?? String(i)}
          renderItem={({ item }) => <DealRow deal={item} />}
          refreshing={isFetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <EmptyView
              icon={<Handshake size={40} color={colors.inkFaint} />}
              title={filter === 'all' ? 'No deals yet' : `No ${filter} deals`}
              message="Deals you place on bonds will appear here."
              action={<Button title="Explore Bonds" size="sm" onPress={() => router.push('/explore')} />}
            />
          }
        />
      )}
    </Screen>
  );
}
