import { router } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';

import { CategoryIcon } from '@/components/bonds/CategoryIcon';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '@/components/ui/StateViews';
import { useCategoriesQuery } from '@/store/api/bondsAddaApi';

export default function CategoriesScreen() {
  const { data, error, isLoading, isFetching, refetch } = useCategoriesQuery();

  return (
    <Screen scroll={false} header={<ScreenHeader title="Categories" />} contentClassName="" className="bg-surface">
      {isLoading ? (
        <LoadingView />
      ) : error && !data ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : (
        <FlatList
          data={data ?? []}
          numColumns={2}
          keyExtractor={(c) => c.CategoryId}
          refreshing={isFetching}
          onRefresh={refetch}
          columnWrapperClassName="gap-3"
          contentContainerClassName="gap-3 p-4"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/explore', params: { categoryId: item.CategoryId } })}
              accessibilityRole="button"
              accessibilityLabel={`${item.CategoryName} bonds`}
              className="flex-1 items-center rounded-2xl border border-line bg-white px-3 py-6 active:bg-surface"
            >
              <View className="h-14 w-14 items-center justify-center">
                <CategoryIcon name={item.CategoryName} size={34} />
              </View>
              <Text className="mt-2 text-center font-semibold text-ink">{item.CategoryName}</Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
