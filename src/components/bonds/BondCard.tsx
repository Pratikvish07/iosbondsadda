import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { issuerName, ratingTone } from '@/lib/bonds';
import { bondTerms, minimumInvestment } from '@/lib/bondMath';
import { clean, formatCurrency, formatMonthYear, formatPercent } from '@/lib/format';
import type { Product } from '@/store/api/types';
import { colors } from '@/theme/colors';

import { BondLogo } from './BondLogo';

function BondCardBase({ product }: { product: Product }) {
  const name = issuerName(product);
  const terms = bondTerms(product);
  const yieldValue = terms.ytm ?? terms.couponRate;
  const category = clean(product.CategoryName);
  const rating = clean(product.CreditRating);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/bonds/[id]', params: { id: product.ProductId } })}
      accessibilityRole="button"
      accessibilityLabel={`${name}, yield ${formatPercent(yieldValue)}, matures ${formatMonthYear(product.MaturityDate)}`}
      className="flex-row items-center border-b border-line bg-white px-5 py-4 active:bg-surface"
    >
      <BondLogo uri={product.ImageUrl} name={name} />
      <View className="ml-3 flex-1">
        <View className="flex-row flex-wrap items-center gap-1.5">
          <Text className="mr-1 shrink text-base font-bold text-ink" numberOfLines={1}>
            {name}
          </Text>
          {rating ? <Badge label={rating} tone={ratingTone(rating)} /> : null}
          {category ? <Badge label={category} tone="warning" /> : null}
        </View>
        <Text className="mt-1 text-lg font-bold text-success">
          {formatPercent(yieldValue)} <Text className="text-sm font-medium">{terms.ytm != null ? 'YTM' : 'p.a.'}</Text>
        </Text>
        <Text className="text-xs text-ink-muted">Maturity: {formatMonthYear(product.MaturityDate)}</Text>
        <Text className="text-xs text-ink-muted">Min. Inv: {formatCurrency(minimumInvestment(terms))}</Text>
      </View>
      <ChevronRight size={20} color={colors.inkFaint} />
    </Pressable>
  );
}

export const BondCard = memo(BondCardBase);

/** Compact featured card for the home screen carousel. */
export function FeaturedBondCard({ product, width }: { product: Product; width: number }) {
  const name = issuerName(product);
  const terms = bondTerms(product);
  const rating = clean(product.CreditRating);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/bonds/[id]', params: { id: product.ProductId } })}
      accessibilityRole="button"
      accessibilityLabel={`${name}, coupon ${formatPercent(terms.couponRate)}`}
      style={{ width }}
      className="rounded-2xl border border-line bg-white p-4 active:bg-surface"
    >
      <View className="flex-row items-start">
        <BondLogo uri={product.ImageUrl} name={name} size={44} />
        <View className="ml-3 flex-1">
          <View className="flex-row flex-wrap items-center gap-1.5">
            <Text className="shrink font-bold text-ink" numberOfLines={1}>
              {name}
            </Text>
            {rating ? <Badge label={rating} tone={ratingTone(rating)} /> : null}
          </View>
          <Text className="mt-0.5 text-base font-bold text-success">{formatPercent(terms.couponRate)} p.a.</Text>
          <Text className="text-xs text-ink-muted" numberOfLines={1}>
            {clean(product.CategoryName)} · {clean(product.PaymentType)} interest
          </Text>
        </View>
        <ChevronRight size={18} color={colors.inkFaint} />
      </View>
      <View className="mt-4 flex-row items-end justify-between border-t border-line pt-3">
        <View>
          <Text className="text-xs text-ink-muted">Maturity</Text>
          <Text className="font-semibold text-ink">{formatMonthYear(product.MaturityDate)}</Text>
        </View>
        <View>
          <Text className="text-xs text-ink-muted">Min. Investment</Text>
          <Text className="font-semibold text-ink">{formatCurrency(minimumInvestment(terms))}</Text>
        </View>
        <View className="h-9 w-9 items-center justify-center rounded-full bg-success">
          <ChevronRight size={18} color={colors.white} />
        </View>
      </View>
    </Pressable>
  );
}
