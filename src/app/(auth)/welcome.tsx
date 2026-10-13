import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ArrowRight, ChartColumn, LayoutGrid, ShieldCheck } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { colors } from '@/theme/colors';

function Highlight({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <View className="flex-1 items-center">
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">{icon}</View>
      <Text className="mt-2 text-sm font-medium text-ink">{label}</Text>
    </View>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 bg-[#FBF6EC] px-6"
      style={{ paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 20) }}
    >
      <View className="flex-1 items-center justify-center">
        <Image
          source={require('@/assets/images/bondsaddalogo.png')}
          style={{ width: 280, height: 61 }}
          contentFit="contain"
          accessibilityLabel="BondsAdda"
        />
        <Text className="mt-8 text-center text-2xl font-semibold leading-8 text-ink">
          Invest in Bonds.{'\n'}Build a Better Tomorrow.
        </Text>
        <Text className="mt-3 text-center text-ink-muted">
          Explore rated corporate, PSU and government bonds with predictable returns.
        </Text>

        <View className="mt-12 flex-row">
          <Highlight icon={<ShieldCheck size={26} color={colors.success} />} label="Safe" />
          <Highlight icon={<ChartColumn size={26} color={colors.brandOrange} />} label="Stable Returns" />
          <Highlight icon={<LayoutGrid size={26} color={colors.brandBlue} />} label="Diversified" />
        </View>
      </View>

      <Button
        title="Get Started"
        onPress={() => router.push('/signup')}
        rightIcon={<ArrowRight size={18} color={colors.white} />}
      />
      <View className="mt-5 flex-row justify-center">
        <Text className="text-ink-muted">Already have an account? </Text>
        <Pressable onPress={() => router.push('/login')} accessibilityRole="link" hitSlop={8}>
          <Text className="font-semibold text-brand-blue">Sign In</Text>
        </Pressable>
      </View>
    </View>
  );
}
