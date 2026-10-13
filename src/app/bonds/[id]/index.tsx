import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ArrowLeft, ExternalLink, FileText, Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BondLogo } from '@/components/bonds/BondLogo';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, Divider, InfoRow, StatTile } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/StateViews';
import { UnderlineTabs } from '@/components/ui/Tabs';
import { API_ORIGIN } from '@/config/env';
import { issuerName, ratingTone } from '@/lib/bonds';
import { bondTerms, cashFlowSchedule, addBusinessDays, minimumInvestment } from '@/lib/bondMath';
import { clean, formatCurrency, formatDate, formatMonthYear, formatPercent, resolveAssetUrl } from '@/lib/format';
import { useProductDetailQuery } from '@/store/api/bondsAddaApi';
import { useCustomerId } from '@/store/hooks';
import { colors } from '@/theme/colors';

type Tab = 'overview' | 'details' | 'cashflows' | 'documents';
const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'details', label: 'Details' },
  { value: 'cashflows', label: 'Cash Flows' },
  { value: 'documents', label: 'Documents' },
];

export default function BondDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customerId = useCustomerId();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('overview');
  const { data, error, isLoading, isFetching, refetch } = useProductDetailQuery({ productId: id, customerId });

  if (isLoading) return <LoadingView label="Loading bond…" />;
  if (!data) return <ErrorView error={error} onRetry={refetch} />;

  const product = data.Product;
  const name = issuerName(product);
  const terms = bondTerms(product);
  const rating = clean(product.CreditRating);
  const soldOut = terms.availableUnits !== null && terms.availableUnits <= 0;
  // Illustrative schedule for one unit (face value) from the next settlement date.
  const sampleSchedule = cashFlowSchedule(terms, terms.faceValue, addBusinessDays(new Date(), 1));
  const documents = [
    { label: 'Information Memorandum', path: data.MemorandumFile },
    { label: 'Product Document', path: data.ProductFile },
  ].filter((d) => resolveAssetUrl(d.path));

  const share = () => {
    const url = product.DetailsUrl ? `${API_ORIGIN}${product.DetailsUrl}` : API_ORIGIN;
    Share.share({ message: `${name} · ${formatPercent(terms.couponRate)} coupon on BondsAdda\n${url}` }).catch(() => {});
  };

  return (
    <Screen
      edgeToEdgeTop
      onRefresh={refetch}
      refreshing={isFetching}
      contentClassName="pb-8"
      footer={
        <Button
          title={soldOut ? 'Sold Out' : 'Invest Now'}
          variant="success"
          disabled={soldOut}
          onPress={() => router.push({ pathname: '/bonds/[id]/invest', params: { id: product.ProductId } })}
        />
      }
    >
      <View className="bg-navy px-5 pb-8" style={{ paddingTop: insets.top + 8 }}>
        <View className="mb-4 flex-row justify-between">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/explore'))}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-10 w-10 items-center justify-center"
          >
            <ArrowLeft size={22} color={colors.white} />
          </Pressable>
          <Pressable
            onPress={share}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Share bond"
            className="h-10 w-10 items-center justify-center"
          >
            <Share2 size={20} color={colors.white} />
          </Pressable>
        </View>
        <View className="flex-row items-center">
          <BondLogo uri={product.ImageUrl} name={name} size={60} />
          <View className="ml-4 flex-1">
            <Text className="text-xl font-bold text-white" accessibilityRole="header">
              {name}
            </Text>
            <Text className="mt-0.5 text-sm text-white/70" numberOfLines={2}>
              {clean(product.Security)}
            </Text>
          </View>
        </View>
        <View className="mt-4 flex-row flex-wrap gap-2">
          {rating ? <Badge label={rating} tone={ratingTone(rating)} /> : null}
          {clean(product.CategoryName) ? <Badge label={clean(product.CategoryName)} tone="warning" /> : null}
          {clean(data.DataStatus) ? <Badge label={clean(data.DataStatus)} tone="info" /> : null}
        </View>
      </View>

      <View className="-mt-4 rounded-t-3xl bg-white px-5 pt-5">
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-xs text-ink-muted">Coupon</Text>
            <Text className="text-2xl font-bold text-success">{formatPercent(terms.couponRate)} p.a.</Text>
          </View>
          {terms.ytm !== null ? (
            <View className="items-end">
              <Text className="text-xs text-ink-muted">Yield to maturity</Text>
              <Text className="text-lg font-bold text-ink">{formatPercent(terms.ytm)}</Text>
            </View>
          ) : null}
        </View>

        <View className="mt-4">
          <UnderlineTabs options={TABS} value={tab} onChange={setTab} />
        </View>

        {tab === 'overview' ? (
          <View className="mt-4">
            <View className="flex-row gap-3">
              <StatTile label="Maturity Date" value={formatMonthYear(product.MaturityDate)} />
              <StatTile label="Face Value" value={formatCurrency(terms.faceValue)} />
              <StatTile label="Min. Investment" value={formatCurrency(minimumInvestment(terms))} />
            </View>
            <View className="mt-3 flex-row gap-3">
              <StatTile label="Yield to Maturity" value={formatPercent(terms.ytm)} />
              <StatTile label="Coupon Frequency" value={clean(product.PaymentType) || '—'} />
              <StatTile label="Rating" value={rating || '—'} />
            </View>
            <Text className="mb-2 mt-6 text-lg font-bold text-ink">About {name}</Text>
            <Text className="leading-5 text-ink-muted">
              {clean(data.Description) ||
                `${clean(product.Security)} is a ${clean(data.MaturityType).toLowerCase() || 'fixed'}-maturity bond${
                  clean(data.GuaranteedBy) ? ` issued by ${clean(data.GuaranteedBy)}` : ''
                } paying ${clean(product.PaymentType).toLowerCase() || 'periodic'} interest at ${formatPercent(
                  terms.couponRate,
                )} per annum.`}
            </Text>
          </View>
        ) : null}

        {tab === 'details' ? (
          <Card className="mt-4">
            <InfoRow label="ISIN" value={clean(product.ISINNumber) || '—'} />
            <Divider />
            <InfoRow label="Issuer / Guarantor" value={clean(data.GuaranteedBy) || '—'} />
            <Divider />
            <InfoRow label="Security Type" value={clean(data.DataStatus) || '—'} />
            <Divider />
            <InfoRow label="Maturity Type" value={clean(data.MaturityType) || '—'} />
            <Divider />
            <InfoRow label="Maturity Date" value={formatDate(product.MaturityDate)} />
            <Divider />
            <InfoRow label="Next Interest Date" value={formatDate(product.IPDate)} />
            <Divider />
            <InfoRow label="Price (per ₹100 FV)" value={terms.price.toFixed(2)} />
            <Divider />
            <InfoRow label="Put / Call Date" value={clean(data.PutCallDate) || clean(data.CallDate) || 'N/A'} />
            <Divider />
            <InfoRow
              label="Units Available"
              value={terms.availableUnits !== null ? terms.availableUnits.toLocaleString('en-IN') : '—'}
            />
          </Card>
        ) : null}

        {tab === 'cashflows' ? (
          <View className="mt-4">
            <Text className="mb-3 text-sm text-ink-muted">
              Projected payouts for one unit ({formatCurrency(terms.faceValue)} face value). Choose your quantity on the
              next screen for exact figures.
            </Text>
            {sampleSchedule.length ? (
              <Card className="py-1">
                {sampleSchedule.slice(0, 12).map((row, i) => (
                  <View key={row.date.toISOString()}>
                    {i > 0 ? <Divider /> : null}
                    <View className="flex-row justify-between py-2.5">
                      <Text className="text-ink">{formatDate(row.date)}</Text>
                      <Text className="text-ink-muted">{row.principal ? 'Principal + Interest' : 'Interest'}</Text>
                      <Text className="font-semibold text-ink">{formatCurrency(row.total, true)}</Text>
                    </View>
                  </View>
                ))}
                {sampleSchedule.length > 12 ? (
                  <Text className="py-2 text-center text-xs text-ink-muted">
                    + {sampleSchedule.length - 12} more payouts until {formatMonthYear(product.MaturityDate)}
                  </Text>
                ) : null}
              </Card>
            ) : (
              <EmptyView title="Schedule unavailable" message="Cash-flow dates are not available for this bond." />
            )}
          </View>
        ) : null}

        {tab === 'documents' ? (
          <View className="mt-4">
            {documents.length ? (
              documents.map((d) => (
                <Card
                  key={d.label}
                  className="mb-3 flex-row items-center"
                  onPress={() => WebBrowser.openBrowserAsync(resolveAssetUrl(d.path)!)}
                  accessibilityLabel={`Open ${d.label}`}
                >
                  <FileText size={22} color={colors.brandBlue} />
                  <Text className="ml-3 flex-1 font-semibold text-ink">{d.label}</Text>
                  <ExternalLink size={18} color={colors.inkMuted} />
                </Card>
              ))
            ) : (
              <EmptyView title="No documents" message="Offer documents for this bond are not available yet." />
            )}
            {data.FAQs.length ? (
              <>
                <Text className="mb-2 mt-4 text-lg font-bold text-ink">FAQs</Text>
                {data.FAQs.map((faq, i) => (
                  <Card key={i} className="mb-3">
                    <Text className="font-semibold text-ink">{clean(faq.Question)}</Text>
                    <Text className="mt-1 text-ink-muted">{clean(faq.Answer)}</Text>
                  </Card>
                ))}
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
