import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ChevronRight, Search, ShieldAlert } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { FeaturedBondCard } from '@/components/bonds/BondCard';
import { CategoryIcon } from '@/components/bonds/CategoryIcon';
import { SectionTitle } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ErrorView, LoadingView } from '@/components/ui/StateViews';
import { formatCurrency } from '@/lib/format';
import { statusTone } from '@/components/ui/Badge';
import {
  useCategoriesQuery,
  useKycStatusQuery,
  usePortfolioQuery,
  useProductsQuery,
} from '@/store/api/bondsAddaApi';
import { useCustomerId, useSession } from '@/store/hooks';
import { colors } from '@/theme/colors';

const FEATURED_COUNT = 6;

export default function HomeScreen() {
  const customerId = useCustomerId();
  const session = useSession();
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState('');

  const categories = useCategoriesQuery();
  const featured = useProductsQuery({ pageIndex: 1, pageSize: FEATURED_COUNT });
  const kyc = useKycStatusQuery({ customerId });
  const portfolio = usePortfolioQuery({ customerId });

  const refreshing = featured.isFetching || categories.isFetching || kyc.isFetching || portfolio.isFetching;
  const refresh = () => {
    categories.refetch();
    featured.refetch();
    kyc.refetch();
    portfolio.refetch();
  };

  const submitSearch = () => {
    const q = search.trim();
    router.push({ pathname: '/explore', params: q ? { q } : {} });
  };

  const kycVerified = statusTone(kyc.data?.OverallStatus) === 'success';
  const cardWidth = Math.min(width - 56, 360);
  const firstName = session?.fullName?.split(' ')[0];

  return (
    <Screen insetBottom={false} refreshing={refreshing} onRefresh={refresh} contentClassName="pb-8">
      <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
        <Image
          source={require('@/assets/images/bondsaddalogo.png')}
          style={{ width: 150, height: 33 }}
          contentFit="contain"
          accessibilityLabel="BondsAdda"
        />
      </View>

      <View className="mx-5 overflow-hidden rounded-3xl bg-[#FBF6EC] p-5">
        <Text className="text-xs font-semibold uppercase tracking-wider text-brand-orange">
          {firstName ? `Hi ${firstName}` : 'Welcome'}
        </Text>
        <Text className="mt-1 text-xl font-bold leading-7 text-navy">
          Discover High-Quality Bonds for a Secure Future
        </Text>
        <Text className="mt-1 text-sm text-ink-muted">Better Investments. Brighter Tomorrow.</Text>
        <View className="mt-4 h-12 flex-row items-center rounded-xl bg-white pl-4 pr-1.5">
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search bonds, issuers, categories…"
            placeholderTextColor={colors.inkFaint}
            className="flex-1 text-sm text-ink"
            returnKeyType="search"
            onSubmitEditing={submitSearch}
            accessibilityLabel="Search bonds"
          />
          <Pressable
            onPress={submitSearch}
            accessibilityRole="button"
            accessibilityLabel="Search"
            className="h-9 w-9 items-center justify-center rounded-lg bg-navy"
          >
            <Search size={18} color={colors.white} />
          </Pressable>
        </View>
      </View>

      {kyc.data && !kycVerified ? (
        <Pressable
          onPress={() => router.push('/kyc')}
          accessibilityRole="button"
          className="mx-5 mt-4 flex-row items-center rounded-2xl border border-warning-light bg-warning-light px-4 py-3"
        >
          <ShieldAlert size={22} color={colors.warning} />
          <View className="ml-3 flex-1">
            <Text className="font-semibold text-ink">Complete your KYC</Text>
            <Text className="text-xs text-ink-muted">
              KYC status: {kyc.data.OverallStatus ?? 'Pending'}. Verification is required before investing.
            </Text>
          </View>
          <ChevronRight size={18} color={colors.inkMuted} />
        </Pressable>
      ) : null}

      {portfolio.data && portfolio.data.Summary.TotalInvested > 0 ? (
        <Pressable
          onPress={() => router.push('/portfolio')}
          accessibilityRole="button"
          className="mx-5 mt-4 rounded-2xl bg-navy p-4"
        >
          <Text className="text-sm text-white/70">Total Investment</Text>
          <Text className="mt-1 text-2xl font-bold text-white">
            {formatCurrency(portfolio.data.Summary.TotalInvested)}
          </Text>
          <Text className="mt-1 text-xs text-white/70">
            {portfolio.data.Summary.Holdings} holdings · Est. annual interest{' '}
            {formatCurrency(portfolio.data.Summary.EstimatedAnnualInterest)}
          </Text>
        </Pressable>
      ) : null}

      <View className="px-5">
        <SectionTitle
          title="Categories"
          action={
            <Pressable onPress={() => router.push('/categories')} hitSlop={8} accessibilityRole="link">
              <Text className="text-sm font-semibold text-brand-blue">View All</Text>
            </Pressable>
          }
        />
      </View>
      {categories.data ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-5">
          {categories.data.map((c) => (
            <Pressable
              key={c.CategoryId}
              onPress={() => router.push({ pathname: '/explore', params: { categoryId: c.CategoryId } })}
              accessibilityRole="button"
              accessibilityLabel={`${c.CategoryName} category`}
              className="w-20 items-center"
            >
              <View className="h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface">
                <CategoryIcon name={c.CategoryName} />
              </View>
              <Text className="mt-1.5 text-center text-xs text-ink" numberOfLines={2}>
                {c.CategoryName}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : categories.isError ? (
        <ErrorView error={categories.error} onRetry={categories.refetch} />
      ) : (
        <LoadingView />
      )}

      <View className="px-5">
        <SectionTitle
          title="Featured Bonds"
          action={
            <Pressable onPress={() => router.push('/explore')} hitSlop={8} accessibilityRole="link">
              <Text className="text-sm font-semibold text-brand-blue">View All</Text>
            </Pressable>
          }
        />
      </View>
      {featured.data ? (
        <FlatList
          horizontal
          data={featured.data.Products.slice(0, FEATURED_COUNT)}
          keyExtractor={(p) => p.ProductId}
          renderItem={({ item }) => <FeaturedBondCard product={item} width={cardWidth} />}
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-3 px-5"
          snapToInterval={cardWidth + 12}
          decelerationRate="fast"
        />
      ) : featured.isError ? (
        <ErrorView error={featured.error} onRetry={featured.refetch} />
      ) : (
        <LoadingView />
      )}

      <Text className="mx-5 mt-8 text-center text-[11px] leading-4 text-ink-faint">
        Investments in debt securities are subject to risks. Read all offer-related documents carefully before
        investing.
      </Text>
    </Screen>
  );
}
