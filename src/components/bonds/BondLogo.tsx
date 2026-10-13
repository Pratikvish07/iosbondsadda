import { Image } from 'expo-image';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { initials, resolveAssetUrl } from '@/lib/format';

export function BondLogo({ uri, name, size = 48 }: { uri: string | null | undefined; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const source = resolveAssetUrl(uri);

  return (
    <View
      className="items-center justify-center overflow-hidden rounded-xl border border-line bg-white"
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {source && !failed ? (
        <Image
          source={{ uri: source }}
          style={{ width: size - 8, height: size - 8 }}
          contentFit="contain"
          transition={150}
          cachePolicy="memory-disk"
          onError={() => setFailed(true)}
        />
      ) : (
        <Text className="font-bold text-brand-blue" style={{ fontSize: size * 0.32 }}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
}
