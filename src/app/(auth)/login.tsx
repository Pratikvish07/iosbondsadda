import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Lock, Mail } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { ErrorBanner } from '@/components/ui/StateViews';
import { TextField } from '@/components/ui/TextField';
import { CONTACT_URL } from '@/config/env';
import { hasErrors, isEmail, isIndianMobile, required, rule, validate } from '@/lib/validation';
import { useLoginMutation } from '@/store/api/bondsAddaApi';
import { getErrorMessage } from '@/store/api/baseQuery';
import { colors } from '@/theme/colors';

type Values = { userName: string; password: string };

export default function LoginScreen() {
  const params = useLocalSearchParams<{ userName?: string; registered?: string }>();
  const [values, setValues] = useState<Values>({ userName: params.userName ?? '', password: '' });
  const [errors, setErrors] = useState<Partial<Values>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [login, { isLoading }] = useLoginMutation();
  const passwordRef = useRef<TextInput>(null);

  const set = (key: keyof Values) => (text: string) => {
    setValues((v) => ({ ...v, [key]: text }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async () => {
    setFormError(null);
    const found = validate(values, {
      userName: [
        required('Email or mobile number'),
        rule((v) => isEmail(v) || isIndianMobile(v), 'Enter a valid email or 10-digit mobile number'),
      ],
      password: [required('Password')],
    });
    setErrors(found);
    if (hasErrors(found)) return;

    try {
      const session = await login({ userName: values.userName.trim(), password: values.password }).unwrap();
      // On success the auth guard swaps the (auth) stack for the app automatically.
      if (!session) setFormError('Sign-in succeeded but no customer account was returned. Please contact support.');
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to sign in. Please try again.'));
    }
  };

  return (
    <Screen keyboard header={<ScreenHeader title="" />} contentClassName="px-6 pb-10">
      <View className="items-center">
        <Image
          source={require('@/assets/images/bondsaddalogo.png')}
          style={{ width: 200, height: 44 }}
          contentFit="contain"
          accessibilityLabel="BondsAdda"
        />
        <Text className="mt-6 text-2xl font-bold text-ink" accessibilityRole="header">
          Welcome Back
        </Text>
        <Text className="mt-1 text-ink-muted">Sign in to your BondsAdda account</Text>
      </View>

      <View className="mt-8">
        {params.registered ? (
          <View className="mb-4 rounded-xl bg-success-light px-4 py-3">
            <Text className="text-sm text-success-dark">Account created. Sign in to continue.</Text>
          </View>
        ) : null}
        <ErrorBanner message={formError} />

        <TextField
          placeholder="Email or Mobile"
          value={values.userName}
          onChangeText={set('userName')}
          error={errors.userName}
          icon={<Mail size={20} color={colors.inkMuted} />}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          keyboardType="email-address"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          placeholder="Password"
          value={values.password}
          onChangeText={set('password')}
          error={errors.password}
          icon={<Lock size={20} color={colors.inkMuted} />}
          password
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        <Pressable
          className="mb-6 self-end"
          hitSlop={8}
          accessibilityRole="link"
          // The API has no password-reset action yet; customer care handles resets.
          onPress={() => WebBrowser.openBrowserAsync(CONTACT_URL)}
        >
          <Text className="font-semibold text-brand-blue">Forgot Password?</Text>
        </Pressable>

        <Button title="Sign In" onPress={submit} loading={isLoading} />

        <View className="mt-8 flex-row justify-center">
          <Text className="text-ink-muted">Don&apos;t have an account? </Text>
          <Pressable onPress={() => router.replace('/signup')} accessibilityRole="link" hitSlop={8}>
            <Text className="font-semibold text-brand-blue">Sign Up</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
