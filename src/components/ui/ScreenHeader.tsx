import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

interface ScreenHeaderProps {
  title: string;
  /** Hide the back button on root screens such as tabs. */
  showBack?: boolean;
  right?: ReactNode;
}

export function ScreenHeader({ title, showBack = true, right }: ScreenHeaderProps) {
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View className="h-14 flex-row items-center bg-white px-3">
      <View className="w-11">
        {showBack ? (
          <Pressable
            onPress={goBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-10 w-10 items-center justify-center rounded-full active:bg-surface"
          >
            <ArrowLeft size={22} color={colors.ink} />
          </Pressable>
        ) : null}
      </View>
      <Text className="flex-1 text-center text-lg font-bold text-ink" numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      <View className="w-11 items-end">{right}</View>
    </View>
  );
}
