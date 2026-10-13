import { Tabs } from 'expo-router';
import { Briefcase, Compass, Handshake, House, User } from 'lucide-react-native';

import { colors } from '@/theme/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: { borderTopColor: colors.line, backgroundColor: colors.white },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
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
