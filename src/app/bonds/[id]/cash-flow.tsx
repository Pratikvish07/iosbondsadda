import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { BondLogo } from '@/components/bonds/BondLogo';
import { Button } from '@/components/ui/Button';
import { Card, Divider } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyView, ErrorBanner, ErrorView, LoadingView } from '@/components/ui/StateViews';
import { UnderlineTabs } from '@/components/ui/Tabs';
import { issuerName } from '@/lib/bonds';
import { bondTerms, quoteDeal, toScheduleRows } from '@/lib/bondMath';
import { pickString } from '@/lib/fields';
import { clean, formatCurrency, formatDate, formatMonthYear, parseApiDate, toApiDate } from '@/lib/format';
import { useCashFlowsQuery, useInvestmentPreviewQuery, useSaveCashFlowMutation } from '@/store/api/bondsAddaApi';
import { getErrorMessage } from '@/store/api/baseQuery';
import { useCustomerId } from '@/store/hooks';
import { colors } from '@/theme/colors';

type Tab = 'schedule' | 'saved';

export default function CashFlowScheduleScreen() {
  const { id, qty } = useLocalSearchParams<{ id: string; qty?: string }>();
  const customerId = useCustomerId();
  const quantity = Math.max(1, parseInt(qty ?? '1', 10) || 1);
  const [tab, setTab] = useState<Tab>('schedule');
  const [saveError, setSaveError] = useState<string | null>(null);

  const preview = useInvestmentPreviewQuery({ productId: id, customerId });
  const saved = useCashFlowsQuery({ customerId, productId: id });
  const [saveCashFlow, { isLoading: saving }] = useSaveCashFlowMutation();

  const product = preview.data?.Product;
  const lastInterestDate = preview.data?.LastInterestDate ?? null;
  const computed = useMemo(() => {
    if (!product) return null;
    const terms = bondTerms(product);
    const quote = quoteDeal(terms, quantity, parseApiDate(lastInterestDate));
    return { terms, quote, rows: quote.schedule };
  }, [product, quantity, lastInterestDate]);

  if (preview.isLoading) return <LoadingView />;
  if (!product || !computed) return <ErrorView error={preview.error} onRetry={preview.refetch} />;

  const { terms, quote, rows } = computed;
  const name = issuerName(product);

  const save = async () => {
    setSaveError(null);
    try {
      const result = await saveCashFlow({
        customerId,
        productId: product.ProductId,
        paymentType: clean(product.PaymentType),
        sattlementDate: toApiDate(quote.settlementDate),
        lastIpDate: quote.lastInterestDate ? toApiDate(quote.lastInterestDate) : '',
        faceValueForDeal: quote.principal.toFixed(2),
        totalConsiderationAmount: quote.totalPayable.toFixed(2),
        quantity: String(quantity),
        principalAmount: quote.principal.toFixed(2),
        totalAssuredInterest: quote.totalInterestToMaturity.toFixed(2),
        grossConsideration: quote.grossConsideration.toFixed(2),
        priceRate: terms.price.toFixed(2),
        schedule: toScheduleRows(rows),
      }).unwrap();
      Alert.alert('Saved', result.message ?? 'Cash-flow schedule saved.');
      setTab('saved');
    } catch (error) {
      setSaveError(getErrorMessage(error, 'Unable to save this schedule.'));
    }
  };

  return (
    <Screen
      header={<ScreenHeader title="Cash Flow" />}
      refreshing={saved.isFetching}
      onRefresh={saved.refetch}
      footer={
        tab === 'schedule' && rows.length ? (
          <Button title="Save Schedule" variant="outline" loading={saving} onPress={save} />
        ) : undefined
      }
    >
      <Card className="mt-2 flex-row items-center">
        <BondLogo uri={product.ImageUrl} name={name} size={44} />
        <View className="ml-3 flex-1">
          <Text className="font-bold text-ink" numberOfLines={1}>
            {name}
          </Text>
          <Text className="text-xs text-ink-muted">
            {quantity} unit{quantity > 1 ? 's' : ''} · Maturity {formatMonthYear(product.MaturityDate)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-xs text-ink-muted">Total Interest</Text>
          <Text className="font-bold text-success">{formatCurrency(quote.totalInterestToMaturity)}</Text>
        </View>
      </Card>

      <View className="mt-4">
        <UnderlineTabs
          options={[
            { value: 'schedule', label: 'Cash Flow Schedule' },
            { value: 'saved', label: 'Saved' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === 'schedule' ? (
        rows.length ? (
          <Card className="mt-4 px-3 py-1">
            <View className="flex-row py-2">
              <Text className="w-28 text-xs font-semibold text-ink-muted">Date</Text>
              <Text className="flex-1 text-xs font-semibold text-ink-muted">Description</Text>
              <Text className="text-xs font-semibold text-ink-muted">Amount</Text>
            </View>
            {rows.map((row) => (
              <View key={row.date.toISOString()}>
                <Divider />
                <View className="flex-row items-center py-2.5">
                  <Text className="w-28 text-sm text-ink">{formatDate(row.date)}</Text>
                  <Text className="flex-1 text-sm text-ink-muted">
                    {row.principal ? 'Principal + Interest' : 'Interest'}
                  </Text>
                  <Text className="text-sm font-semibold text-ink">{formatCurrency(row.total, true)}</Text>
                </View>
              </View>
            ))}
          </Card>
        ) : (
          <EmptyView title="No upcoming payouts" message="This bond has no remaining cash flows." />
        )
      ) : saved.isLoading ? (
        <LoadingView />
      ) : saved.error && !saved.data ? (
        <ErrorView error={saved.error} onRetry={saved.refetch} />
      ) : saved.data?.Items.length ? (
        <View className="mt-4">
          {saved.data.Items.map((item, i) => {
            const cashFlowId = pickString(item, 'CashFlowId', 'CashFlowID', 'Id');
            return (
              <Pressable
                key={cashFlowId ?? i}
                disabled={!cashFlowId}
                onPress={() =>
                  cashFlowId &&
                  router.push({ pathname: '/cashflows/[id]', params: { id: cashFlowId, productId: product.ProductId } })
                }
                accessibilityRole="button"
                className="mb-3 flex-row items-center rounded-2xl border border-line px-4 py-3 active:bg-surface"
              >
                <View className="flex-1">
                  <Text className="font-semibold text-ink">
                    {formatCurrency(pickString(item, 'PrincipalAmount', 'FaceValueForDeal'), true)} ·{' '}
                    {pickString(item, 'Quantity') ?? '—'} units
                  </Text>
                  <Text className="text-xs text-ink-muted">
                    Settlement {formatDate(pickString(item, 'SattlementDate', 'SettlementDate', 'CreatedDate'))}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.inkMuted} />
              </Pressable>
            );
          })}
        </View>
      ) : (
        <EmptyView title="No saved schedules" message="Save a schedule to compare it later." />
      )}

      <View className="mt-4">
        <ErrorBanner message={saveError} />
      </View>
      <Text className="mt-2 text-center text-xs text-ink-faint">
        This is an indicative calculation. Final values may vary.
      </Text>
    </Screen>
  );
}
