import { Stack } from 'expo-router';

// "/" belongs to the Home tab; signed-out users land on /welcome instead, avoiding a path conflict.
export const unstable_settings = {
  initialRouteName: 'welcome',
};

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
