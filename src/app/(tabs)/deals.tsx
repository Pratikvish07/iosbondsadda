import { router } from 'expo-router';
import { ChevronRight, Handshake } from 'lucide-react-native';
import { memo, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { BondLogo } from '@/components/bonds/BondLogo';
import { statusTone, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/StateViews';
import { PillTabs } from '@/components/ui/Tabs';
import { useBondLogos } from '@/hooks/useBondLogos';
import { issuerName } from '@/lib/bonds';
import { pickNumber, pickString } from '@/lib/fields';
import { formatCurrency, formatDate, formatMonthYear, formatPercent } from '@/lib/format';
import type { ApiRecord } from '@/store/api/types';
import { useDealsQuery } from '@/store/api/bondsAddaApi';
import { useCustomerId } from '@/store/hooks';
import { colors } from '@/theme/colors';

type Filter = 'all' | 'pending' | 'confirmed' | 'completed';
const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
};

const AMOUNT_KEYS = [
  'ConsiderationWithStampDuty',
  'ConsiderationStamp',
  'TotalConsideration',
  'GrossConsideration',
  'TotalAmount',
  'Amount',
];

type LogoLookup = ReturnType<typeof useBondLogos>;

const dealId = (deal: ApiRecord) => pickString(deal, 'DealConfirmationId', 'DealConfirmationID', 'DealId', 'Id');
const dealStatus = (deal: ApiRecord) => pickString(deal, 'Status', 'DealStatus', 'PaymentStatus') ?? 'Pending';
const dealAmount = (deal: ApiRecord) => pickNumber(deal, ...AMOUNT_KEYS);

function matches(filter: Filter, status: string) {
  if (filter === 'all') return true;
  const s = status.toLowerCase();
  if (filter === 'completed') return /(complete|settled|paid)/.test(s);
  if (filter === 'confirmed') return /confirm/.test(s);
  return statusTone(status) === 'warning' || statusTone(status) === 'neutral';
}

function Stat({ label, value, align = 'left' }: { label: string; value: string; align?: 'left' | 'center' | 'right' }) {
  const alignClass = align === 'center' ? 'items-center' : align === 'right' ? 'items-end' : 'items-start';
  return (
    <View className={`flex-1 ${alignClass}`}>
      <Text className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</Text>
      <Text className="mt-0.5 text-sm font-semibold text-ink">{value}</Text>
    </View>
  );
}

const DealCard = memo(function DealCard({ deal, logoFor }: { deal: ApiRecord; logoFor: LogoLookup }) {
  const id = dealId(deal);
  const productId = pickString(deal, 'ProductId') ?? '';
  const status = dealStatus(deal);
  const amount = dealAmount(deal);
  const security = pickString(deal, 'ProductName', 'Security', 'BondName') ?? 'Bond';
  const name = issuerName({ ProductName: security, Security: security });
  const coupon = pickNumber(deal, 'CouponRate');
  const maturity = pickString(deal, 'MaturityDate');
  const units = pickNumber(deal, 'Quantity', 'Qty');
  const rate = pickNumber(deal, 'Rate', 'Price');

  return (
    <Pressable
      disabled={!id}
      onPress={() => id && router.push({ pathname: '/deals/[id]', params: { id, productId } })}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${status}, ${amount !== undefined ? formatCurrency(amount) : ''}`}
      className="mx-4 mb-3 rounded-2xl border border-line bg-white p-4 active:bg-surface"
    >
      <View className="flex-row items-center">
        <BondLogo uri={pickString(deal, 'ImageUrl') ?? logoFor(pickString(deal, 'ISINNumber'), name)} name={name} size={44} />
        <View className="ml-3 flex-1">
          <Text className="text-base font-bold text-ink" numberOfLines={1}>
            {name}
          </Text>
          <Text className="text-xs text-ink-muted" numberOfLines={1}>
            {coupon !== undefined ? <Text className="font-semibold text-success">{formatPercent(coupon)} p.a.</Text> : null}
            {maturity ? `  ·  Matures ${formatMonthYear(maturity)}` : ''}
          </Text>
        </View>
        <StatusBadge status={status} />
      </View>

      <View className="mt-4 flex-row rounded-xl bg-surface px-3 py-2.5">
        <Stat label="Units" value={units !== undefined ? units.toLocaleString('en-IN') : '—'} />
        <Stat label="Price" value={rate !== undefined ? rate.toFixed(2) : '—'} align="center" />
        <Stat label="Placed on" value={formatDate(pickString(deal, 'DealDate', 'CreatedDate', 'CreatedOn'))} align="right" />
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-sm text-ink-muted">Amount payable</Text>
        <View className="flex-row items-center">
          <Text className="mr-1 text-lg font-bold text-ink">
            {amount !== undefined ? formatCurrency(amount, true) : '—'}
          </Text>
          <ChevronRight size={18} color={colors.inkFaint} />
        </View>
      </View>
    </Pressable>
  );
});

function Summary({ deals }: { deals: ApiRecord[] }) {
  const total = deals.reduce((sum, d) => sum + (dealAmount(d) ?? 0), 0);
  const awaiting = deals.filter((d) => matches('pending', dealStatus(d))).length;
  return (
    <View className="mx-4 mb-4 mt-1 rounded-2xl bg-navy p-5">
      <Text className="text-sm text-white/70">Total deal value</Text>
      <Text className="mt-1 text-3xl font-bold text-white">{formatCurrency(total)}</Text>
      <View className="mt-4 flex-row">
        <View className="flex-1">
          <Text className="text-xs text-white/60">Deals</Text>
          <Text className="text-base font-semibold text-white">{deals.length}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-white/60">Pending</Text>
          <Text className="text-base font-semibold text-amber-300">{awaiting}</Text>
        </View>
      </View>
    </View>
  );
}

export default function DealsScreen() {
  const customerId = useCustomerId();
  const [filter, setFilter] = useState<Filter>('all');
  const { data, error, isLoading, isFetching, refetch } = useDealsQuery({ customerId });
  const logoFor = useBondLogos();

  const all = useMemo(() => data?.Items ?? [], [data]);
  const deals = useMemo(() => all.filter((d) => matches(filter, dealStatus(d))), [all, filter]);
  const filters = useMemo(
    () =>
      (Object.keys(FILTER_LABELS) as Filter[]).map((value) => {
        const count = value === 'all' ? all.length : all.filter((d) => matches(value, dealStatus(d))).length;
        return { value, label: count ? `${FILTER_LABELS[value]} · ${count}` : FILTER_LABELS[value] };
      }),
    [all],
  );

  return (
    <Screen
      scroll={false}
      insetBottom={false}
      className="bg-surface"
      header={<ScreenHeader title="My Deals" showBack={false} />}
      contentClassName=""
    >
      {isLoading ? (
        <LoadingView label="Loading deals…" />
      ) : error && !data ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : (
        <FlatList
          data={deals}
          keyExtractor={(d, i) => dealId(d) ?? String(i)}
          renderItem={({ item }) => <DealCard deal={item} logoFor={logoFor} />}
          refreshing={isFetching}
          onRefresh={refetch}
          contentContainerClassName="pb-6"
          ListHeaderComponent={
            all.length ? (
              <>
                <Summary deals={all} />
                <View className="mb-3">
                  <PillTabs options={filters} value={filter} onChange={setFilter} />
                </View>
              </>
            ) : null
          }
          ListEmptyComponent={
            <EmptyView
              icon={<Handshake size={40} color={colors.inkFaint} />}
              title={filter === 'all' ? 'No deals yet' : `No ${FILTER_LABELS[filter].toLowerCase()} deals`}
              message="Deals you place on bonds will appear here."
              action={
                filter === 'all' ? (
                  <Button title="Explore Bonds" size="sm" onPress={() => router.push('/explore')} />
                ) : undefined
              }
            />
          }
        />
      )}
    </Screen>
  );
}
