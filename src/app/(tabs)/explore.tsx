import { useLocalSearchParams } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { BondCard } from '@/components/bonds/BondCard';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/StateViews';
import { PillTabs } from '@/components/ui/Tabs';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useCategoriesQuery, useProductsQuery } from '@/store/api/bondsAddaApi';
import { colors } from '@/theme/colors';

const PAGE_SIZE = 10;
const ALL = '';

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ categoryId?: string; q?: string }>();
  const [categoryId, setCategoryId] = useState(params.categoryId ?? ALL);
  const [search, setSearch] = useState(params.q ?? '');
  const searchText = useDebouncedValue(search.trim());

  // Deep links from Home / Categories update the filters while the tab is already mounted.
  // Adjusting state during render (rather than in an effect) avoids an extra render pass.
  const [seenParams, setSeenParams] = useState(params);
  if (seenParams.categoryId !== params.categoryId || seenParams.q !== params.q) {
    setSeenParams(params);
    if (params.categoryId !== undefined && params.categoryId !== seenParams.categoryId) {
      setCategoryId(params.categoryId);
    }
    if (params.q !== undefined && params.q !== seenParams.q) setSearch(params.q);
  }

  const categories = useCategoriesQuery();
  // The API has an "All Bonds" category; treat it as no filter so it maps onto the "All" chip.
  const allCategoryIds = useMemo(
    () => new Set((categories.data ?? []).filter((c) => /^all\b/i.test(c.CategoryName)).map((c) => c.CategoryId)),
    [categories.data],
  );
  const activeCategory = allCategoryIds.has(categoryId) ? ALL : categoryId;
  const filters = useMemo(
    () => [
      { value: ALL, label: 'All' },
      ...(categories.data ?? [])
        .filter((c) => !allCategoryIds.has(c.CategoryId))
        .map((c) => ({ value: c.CategoryId, label: c.CategoryName })),
    ],
    [categories.data, allCategoryIds],
  );

  // Page is tied to the filter it was loaded for, so a filter change always starts from page 1
  // in the same render (never requesting page N of a new filter).
  const filterKey = `${activeCategory}|${searchText}`;
  const [paging, setPaging] = useState({ key: filterKey, page: 1 });
  const page = paging.key === filterKey ? paging.page : 1;

  const { data, error, isLoading, isFetching, refetch } = useProductsQuery({
    pageIndex: page,
    pageSize: PAGE_SIZE,
    categoryId: activeCategory,
    searchText,
  });

  const products = data?.Products ?? [];
  const hasMore = !!data && products.length < data.TotalRecords;
  const loadMore = () => {
    if (hasMore && !isFetching) setPaging({ key: filterKey, page: page + 1 });
  };
  const refresh = () => {
    if (page === 1) refetch();
    else setPaging({ key: filterKey, page: 1 });
  };

  return (
    <Screen scroll={false} insetBottom={false} header={<ScreenHeader title="Bonds" showBack={false} />} contentClassName="">
      <View className="px-5 pb-3">
        <View className="h-12 flex-row items-center rounded-xl bg-surface px-4">
          <Search size={18} color={colors.inkMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search bonds…"
            placeholderTextColor={colors.inkFaint}
            className="ml-2 flex-1 text-base text-ink"
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search bonds"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={10} accessibilityLabel="Clear search">
              <X size={18} color={colors.inkMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <View className="pb-2">
        <PillTabs options={filters} value={activeCategory} onChange={setCategoryId} />
      </View>

      {isLoading || (isFetching && page === 1 && !products.length) ? (
        <LoadingView label="Loading bonds…" />
      ) : error && !products.length ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.ProductId}
          renderItem={({ item }) => <BondCard product={item} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshing={isFetching && page === 1}
          onRefresh={refresh}
          keyboardDismissMode="on-drag"
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews
          ListHeaderComponent={
            data ? (
              <Text className="px-5 pb-1 pt-2 text-xs text-ink-muted">
                {data.TotalRecords} bond{data.TotalRecords === 1 ? '' : 's'} available
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyView
              title="No bonds found"
              message={searchText ? `Nothing matches “${searchText}”.` : 'No bonds in this category right now.'}
            />
          }
          ListFooterComponent={
            isFetching && page > 1 ? (
              <ActivityIndicator className="py-6" color={colors.navy} />
            ) : error && products.length ? (
              <Pressable onPress={refetch} className="items-center py-6">
                <Text className="font-semibold text-brand-blue">Couldn&apos;t load more. Tap to retry.</Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </Screen>
  );
}
