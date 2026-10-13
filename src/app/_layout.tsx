import '../../global.css';

import { DefaultTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

import { Button } from '@/components/ui/Button';
import { store } from '@/store';
import { useAppDispatch, useAuthStatus } from '@/store/hooks';
import { restoreSession } from '@/store/slices/authSlice';
import { colors } from '@/theme/colors';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden (e.g. fast refresh); safe to ignore.
});

const navigationTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: colors.navy, background: colors.white, card: colors.white },
};

function RootNavigator() {
  const dispatch = useAppDispatch();
  const status = useAuthStatus();

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  useEffect(() => {
    if (status !== 'restoring') SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  // Keep the native splash visible until we know whether a session exists.
  if (status === 'restoring') return null;
  const signedIn = status === 'signedIn';

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="categories" />
        <Stack.Screen name="bonds" />
        <Stack.Screen name="cashflows" />
        <Stack.Screen name="deals" />
        <Stack.Screen name="kyc" />
        <Stack.Screen name="payments" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <ThemeProvider value={navigationTheme}>
            <StatusBar style="dark" />
            <RootNavigator />
          </ThemeProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <Text className="text-center text-xl font-bold text-ink">Something went wrong</Text>
      <Text className="mt-2 text-center text-ink-muted">
        An unexpected error occurred. Your investments and data are safe. Please try again.
      </Text>
      <Button title="Try again" onPress={retry} className="mt-6 self-stretch" />
    </View>
  );
}
