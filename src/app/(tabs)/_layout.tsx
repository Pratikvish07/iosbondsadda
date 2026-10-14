import { Tabs } from 'expo-router';
import { Briefcase, Compass, Handshake, House, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

const TAB_BAR_CONTENT_HEIGHT = 58;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.inkFaint,
        // The default bar (~49px) clips the label under a 24px icon on web; size it explicitly and
        // add the home-indicator inset so labels never sit under the iPhone's bottom edge.
        tabBarStyle: {
          borderTopColor: colors.line,
          backgroundColor: colors.white,
          height: TAB_BAR_CONTENT_HEIGHT + bottomPadding,
          paddingTop: 6,
          paddingBottom: bottomPadding,
        },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 14, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: 'Explore', tabBarIcon: ({ color, size }) => <Compass color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{ title: 'Portfolio', tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="deals"
        options={{ title: 'Deals', tabBarIcon: ({ color, size }) => <Handshake color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
    </Tabs>
  );
}
