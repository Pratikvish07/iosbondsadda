import { router } from 'expo-router';
import { Briefcase, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BondLogo } from '@/components/bonds/BondLogo';
import { Button } from '@/components/ui/Button';
import { Card, Divider, InfoRow } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/StateViews';
import { UnderlineTabs } from '@/components/ui/Tabs';
import { pickNumber, pickString } from '@/lib/fields';
import { formatCurrency, formatMonthYear, formatPercent } from '@/lib/format';
import { usePortfolioQuery } from '@/store/api/bondsAddaApi';
import { useCustomerId } from '@/store/hooks';
import { colors } from '@/theme/colors';

type Tab = 'holdings' | 'performance';

export default function PortfolioScreen() {
  const customerId = useCustomerId();
  const [tab, setTab] = useState<Tab>('holdings');
  const { data, error, isLoading, isFetching, refetch } = usePortfolioQuery({ customerId });

  return (
    <Screen
      insetBottom={false}
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
          <View className="mt-2 rounded-2xl bg-navy p-5">
            <Text className="text-sm text-white/70">Total Investment</Text>
            <Text className="mt-1 text-3xl font-bold text-white">{formatCurrency(data.Summary.TotalInvested)}</Text>
            <Text className="mt-1 text-xs text-white/70">
              Face value {formatCurrency(data.Summary.TotalFaceValue)}
            </Text>
          </View>

          <View className="mt-4 flex-row">
            <View className="flex-1">
              <Text className="text-xs text-ink-muted">Est. Annual Interest</Text>
              <Text className="mt-0.5 text-lg font-bold text-ink">
                {formatCurrency(data.Summary.EstimatedAnnualInterest)}
              </Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-xs text-ink-muted">Active Bonds</Text>
              <Text className="mt-0.5 text-lg font-bold text-ink">{data.Summary.Holdings}</Text>
            </View>
            <View className="flex-1 items-end">
              <Text className="text-xs text-ink-muted">Total Deals</Text>
              <Text className="mt-0.5 text-lg font-bold text-ink">{data.Summary.TotalDeals}</Text>
            </View>
          </View>

          <View className="mt-5">
            <UnderlineTabs
              options={[
                { value: 'holdings', label: 'Holdings' },
                { value: 'performance', label: 'Performance' },
              ]}
              value={tab}
              onChange={setTab}
            />
          </View>

          {tab === 'holdings' ? (
            data.Holdings.length ? (
              <View className="mt-4 gap-3">
                {data.Holdings.map((h, i) => {
                  const productId = pickString(h, 'ProductId');
                  const name = pickString(h, 'ProductName', 'Security', 'BondName') ?? 'Bond';
                  return (
                    <Pressable
                      key={productId ?? i}
                      disabled={!productId}
                      onPress={() => productId && router.push({ pathname: '/bonds/[id]', params: { id: productId } })}
                      accessibilityRole="button"
                      className="flex-row items-center rounded-2xl border border-line p-4 active:bg-surface"
                    >
                      <BondLogo uri={pickString(h, 'ImageUrl')} name={name} size={44} />
                      <View className="ml-3 flex-1">
                        <Text className="font-bold text-ink" numberOfLines={1}>
                          {name}
                        </Text>
                        <Text className="font-semibold text-success">
                          {formatPercent(pickNumber(h, 'CouponRate', 'Coupon'))} p.a.
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="font-bold text-ink">
                          {formatCurrency(pickNumber(h, 'InvestedAmount', 'TotalInvested', 'Amount', 'TotalConsideration'))}
                        </Text>
                        <Text className="text-xs text-ink-muted">
                          {formatMonthYear(pickString(h, 'MaturityDate'))}
                        </Text>
                      </View>
                      <ChevronRight size={18} color={colors.inkFaint} />
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <EmptyView
                icon={<Briefcase size={40} color={colors.inkFaint} />}
                title="No investments yet"
                message="Your bond holdings will appear here once your first deal settles."
                action={<Button title="Explore Bonds" size="sm" onPress={() => router.push('/explore')} />}
              />
            )
          ) : (
            <Card className="mt-4 py-1">
              <InfoRow label="Total invested" value={formatCurrency(data.Summary.TotalInvested)} />
              <Divider />
              <InfoRow label="Total face value" value={formatCurrency(data.Summary.TotalFaceValue)} />
              <Divider />
              <InfoRow label="Average coupon" value={formatPercent(data.Summary.AverageCoupon)} />
              <Divider />
              <InfoRow
                label="Estimated annual interest"
                value={formatCurrency(data.Summary.EstimatedAnnualInterest)}
                valueClassName="text-success"
              />
              <Divider />
              <InfoRow
                label="Estimated monthly interest"
                value={formatCurrency(data.Summary.EstimatedAnnualInterest / 12)}
              />
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
