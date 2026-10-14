import { router } from 'expo-router';
import { Briefcase, CalendarClock, ChevronRight, TrendingUp } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BondLogo } from '@/components/bonds/BondLogo';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/StateViews';
import { useBondLogos } from '@/hooks/useBondLogos';
import { issuerName } from '@/lib/bonds';
import { pickNumber, pickString } from '@/lib/fields';
import { formatCurrency, formatMonthYear, formatPercent, parseApiDate } from '@/lib/format';
import type { ApiRecord, PortfolioSummary } from '@/store/api/types';
import { usePortfolioQuery } from '@/store/api/bondsAddaApi';
import { useCustomerId } from '@/store/hooks';
import { colors } from '@/theme/colors';

type Tab = 'holdings' | 'allocation';

/** Distinct, brand-aligned colours for allocation bars. */
const SERIES = [colors.brandBlue, colors.brandOrange, colors.success, '#7C3AED', '#0891B2', '#CA8A04'];

interface Holding {
  key: string;
  productId?: string;
  isin?: string;
  name: string;
  coupon?: number;
  units?: number;
  invested: number;
  faceValue?: number;
  annualInterest?: number;
  maturity?: string;
  logo?: string;
}

function toHolding(h: ApiRecord, i: number): Holding {
  const security = pickString(h, 'ProductName', 'Security', 'BondName') ?? 'Bond';
  return {
    key: pickString(h, 'ISINNumber') ?? pickString(h, 'ProductId') ?? String(i),
    productId: pickString(h, 'ProductId'),
    isin: pickString(h, 'ISINNumber'),
    name: issuerName({ ProductName: security, Security: security }),
    coupon: pickNumber(h, 'CouponRate', 'Coupon'),
    units: pickNumber(h, 'Quantity'),
    invested: pickNumber(h, 'Invested', 'InvestedAmount', 'TotalInvested', 'Amount', 'TotalConsideration') ?? 0,
    faceValue: pickNumber(h, 'FaceValue'),
    annualInterest: pickNumber(h, 'EstimatedAnnualInterest'),
    maturity: pickString(h, 'MaturityDate'),
    logo: pickString(h, 'ImageUrl'),
  };
}

function HeroStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="flex-1">
      <Text className="text-[11px] text-white/60">{label}</Text>
      <Text className={`mt-0.5 text-base font-semibold ${accent ? 'text-emerald-300' : 'text-white'}`}>{value}</Text>
    </View>
  );
}

function Hero({ summary }: { summary: PortfolioSummary }) {
  return (
    <View className="mx-4 mt-1 rounded-3xl bg-navy p-5">
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-sm text-white/70">Total Investment</Text>
          <Text className="mt-1 text-3xl font-bold text-white">{formatCurrency(summary.TotalInvested)}</Text>
          <Text className="mt-1 text-xs text-white/60">Face value {formatCurrency(summary.TotalFaceValue)}</Text>
        </View>
        {summary.AverageCoupon > 0 ? (
          <View className="flex-row items-center rounded-full bg-emerald-400/20 px-3 py-1">
            <TrendingUp size={14} color="#6EE7B7" />
            <Text className="ml-1 text-xs font-bold text-emerald-300">{formatPercent(summary.AverageCoupon)}</Text>
          </View>
        ) : null}
      </View>
      <View className="mt-5 flex-row border-t border-white/10 pt-4">
        <HeroStat label="Annual interest" value={formatCurrency(summary.EstimatedAnnualInterest)} accent />
        <HeroStat label="Monthly (avg.)" value={formatCurrency(summary.EstimatedAnnualInterest / 12)} />
        <HeroStat label="Active bonds" value={String(summary.Holdings)} />
      </View>
    </View>
  );
}

function Segmented({ value, onChange }: { value: Tab; onChange: (tab: Tab) => void }) {
  const options: { value: Tab; label: string }[] = [
    { value: 'holdings', label: 'Holdings' },
    { value: 'allocation', label: 'Allocation' },
  ];
  return (
    <View className="mx-4 mt-5 flex-row rounded-xl bg-white p-1" accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`flex-1 items-center rounded-lg py-2.5 ${active ? 'bg-navy' : ''}`}
          >
            <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-ink-muted'}`}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function HoldingCard({ holding }: { holding: Holding }) {
  const { productId } = holding;
  return (
    <Pressable
      disabled={!productId}
      onPress={() => productId && router.push({ pathname: '/bonds/[id]', params: { id: productId } })}
      accessibilityRole={productId ? 'button' : undefined}
      className="mx-4 mb-3 rounded-2xl border border-line bg-white p-4 active:bg-surface"
    >
      <View className="flex-row items-center">
        <BondLogo uri={holding.logo} name={holding.name} size={44} />
        <View className="ml-3 flex-1">
          <Text className="text-base font-bold text-ink" numberOfLines={1}>
            {holding.name}
          </Text>
          <Text className="text-xs text-ink-muted">
            {holding.coupon !== undefined ? (
              <Text className="font-semibold text-success">{formatPercent(holding.coupon)} p.a.</Text>
            ) : null}
            {holding.units !== undefined ? `  ·  ${holding.units} unit${holding.units === 1 ? '' : 's'}` : ''}
          </Text>
        </View>
        {productId ? <ChevronRight size={18} color={colors.inkFaint} /> : null}
      </View>

      <View className="mt-4 flex-row rounded-xl bg-surface px-3 py-2.5">
        <View className="flex-1">
          <Text className="text-[11px] uppercase tracking-wide text-ink-faint">Invested</Text>
          <Text className="mt-0.5 text-sm font-bold text-ink">{formatCurrency(holding.invested)}</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-[11px] uppercase tracking-wide text-ink-faint">Interest / yr</Text>
          <Text className="mt-0.5 text-sm font-bold text-success">
            {holding.annualInterest !== undefined ? formatCurrency(holding.annualInterest) : '—'}
          </Text>
        </View>
        <View className="flex-1 items-end">
          <Text className="text-[11px] uppercase tracking-wide text-ink-faint">Matures</Text>
          <Text className="mt-0.5 text-sm font-bold text-ink">{formatMonthYear(holding.maturity)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function Allocation({ holdings, summary }: { holdings: Holding[]; summary: PortfolioSummary }) {
  const total = holdings.reduce((sum, h) => sum + h.invested, 0) || 1;
  const nextMaturity = holdings
    .map((h) => ({ h, date: parseApiDate(h.maturity) }))
    .filter((x): x is { h: Holding; date: Date } => !!x.date)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

  return (
    <View className="mx-4">
      <View className="rounded-2xl border border-line bg-white p-4">
        <Text className="text-base font-bold text-ink">Where your money is</Text>
        {/* Stacked bar of the whole portfolio. */}
        <View className="mt-3 h-3 flex-row overflow-hidden rounded-full bg-surface">
          {holdings.map((h, i) => (
            <View
              key={h.key}
              style={{ width: `${(h.invested / total) * 100}%`, backgroundColor: SERIES[i % SERIES.length] }}
            />
          ))}
        </View>
        {holdings.map((h, i) => {
          const share = (h.invested / total) * 100;
          return (
            <View key={h.key} className="mt-4">
              <View className="flex-row items-center">
                <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SERIES[i % SERIES.length] }} />
                <Text className="ml-2 flex-1 text-sm text-ink" numberOfLines={1}>
                  {h.name}
                </Text>
                <Text className="text-sm font-semibold text-ink">{share.toFixed(1)}%</Text>
              </View>
              <Text className="ml-[18px] text-xs text-ink-muted">
                {formatCurrency(h.invested)}
                {h.coupon !== undefined ? ` · ${formatPercent(h.coupon)} p.a.` : ''}
              </Text>
            </View>
          );
        })}
      </View>

      <View className="mt-3 flex-row gap-3">
        <View className="flex-1 rounded-2xl border border-line bg-white p-4">
          <TrendingUp size={18} color={colors.success} />
          <Text className="mt-2 text-xs text-ink-muted">Average coupon</Text>
          <Text className="text-lg font-bold text-ink">{formatPercent(summary.AverageCoupon)}</Text>
        </View>
        <View className="flex-1 rounded-2xl border border-line bg-white p-4">
          <CalendarClock size={18} color={colors.brandBlue} />
          <Text className="mt-2 text-xs text-ink-muted">Next maturity</Text>
          <Text className="text-lg font-bold text-ink">
            {nextMaturity ? formatMonthYear(nextMaturity.date) : '—'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function PortfolioScreen() {
  const customerId = useCustomerId();
  const [tab, setTab] = useState<Tab>('holdings');
  const { data, error, isLoading, isFetching, refetch } = usePortfolioQuery({ customerId });
  const logoFor = useBondLogos();

  const holdings = useMemo(
    () =>
      (data?.Holdings ?? [])
        .map(toHolding)
        .map((h) => ({ ...h, logo: h.logo ?? logoFor(h.isin, h.name) ?? undefined }))
        .sort((a, b) => b.invested - a.invested),
    [data, logoFor],
  );

  return (
    <Screen
      insetBottom={false}
      className="bg-surface"
      contentClassName="pb-8"
      header={<ScreenHeader title="Portfolio" showBack={false} />}
      refreshing={isFetching}
      onRefresh={refetch}
    >
      {isLoading ? (
        <LoadingView label="Loading portfolio…" />
      ) : !data ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : (
        <>
          <Hero summary={data.Summary} />
          {holdings.length ? (
            <>
              <Segmented value={tab} onChange={setTab} />
              <View className="mt-4">
                {tab === 'holdings' ? (
                  holdings.map((h) => <HoldingCard key={h.key} holding={h} />)
                ) : (
                  <Allocation holdings={holdings} summary={data.Summary} />
                )}
              </View>
            </>
          ) : (
            <EmptyView
              icon={<Briefcase size={40} color={colors.inkFaint} />}
              title="No investments yet"
              message="Your bond holdings will appear here once your first deal settles."
              action={<Button title="Explore Bonds" size="sm" onPress={() => router.push('/explore')} />}
            />
          )}
        </>
      )}
    </Screen>
  );
}
