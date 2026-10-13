import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Calendar, Check, Lock, Mail, Phone, User } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { ErrorBanner } from '@/components/ui/StateViews';
import { TextField } from '@/components/ui/TextField';
import { PRIVACY_POLICY_URL, TERMS_URL } from '@/config/env';
import {
  hasErrors,
  isEmail,
  isIndianMobile,
  maskDateInput,
  MIN_PASSWORD_LENGTH,
  required,
  rule,
  validate,
  validateDob,
} from '@/lib/validation';
import { useSignupMutation } from '@/store/api/bondsAddaApi';
import { getErrorMessage } from '@/store/api/baseQuery';
import { useAppDispatch } from '@/store/hooks';
import { startSession } from '@/store/slices/authSlice';
import { colors } from '@/theme/colors';

type Values = {
  fullName: string;
  email: string;
  mobile: string;
  dateOfBirth: string;
  password: string;
  confirmPassword: string;
};

const EMPTY: Values = { fullName: '', email: '', mobile: '', dateOfBirth: '', password: '', confirmPassword: '' };

export default function SignupScreen() {
  const dispatch = useAppDispatch();
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Values>>({});
  const [accepted, setAccepted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [signup, { isLoading }] = useSignupMutation();

  const emailRef = useRef<TextInput>(null);
  const mobileRef = useRef<TextInput>(null);
  const dobRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const set = (key: keyof Values) => (text: string) => {
    setValues((v) => ({ ...v, [key]: key === 'dateOfBirth' ? maskDateInput(text) : text }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async () => {
    setFormError(null);
    const found = validate(values, {
      fullName: [required('Full name'), rule((v) => v.trim().length >= 3, 'Enter your full name as per PAN')],
      email: [required('Email'), rule(isEmail, 'Enter a valid email address')],
      mobile: [required('Mobile number'), rule(isIndianMobile, 'Enter a valid 10-digit mobile number')],
      dateOfBirth: [validateDob],
      password: [
        required('Password'),
        rule((v) => v.length >= MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`),
      ],
      confirmPassword: [required('Confirm password'), rule((v) => v === values.password, 'Passwords do not match')],
    });
    setErrors(found);
    if (hasErrors(found)) return;
    if (!accepted) {
      setFormError('Please accept the Terms & Conditions and Privacy Policy to continue.');
      return;
    }

    try {
      const result = await signup({
        fullName: values.fullName.trim(),
        email: values.email.trim().toLowerCase(),
        mobile: values.mobile.trim(),
        password: values.password,
        confirmPassword: values.confirmPassword,
        dateOfBirth: values.dateOfBirth,
      }).unwrap();

      if (result.data) {
        await dispatch(startSession(result.data)).unwrap();
      } else {
        router.replace({ pathname: '/login', params: { userName: values.email.trim(), registered: '1' } });
      }
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to create your account. Please try again.'));
    }
  };

  return (
    <Screen keyboard header={<ScreenHeader title="Create Account" />} contentClassName="px-6 pb-10">
      <Text className="mb-6 text-ink-muted">
        Open your BondsAdda account in a minute. Use details exactly as on your PAN card.
      </Text>
      <ErrorBanner message={formError} />

      <TextField
        label="Full name"
        placeholder="As per PAN"
        value={values.fullName}
        onChangeText={set('fullName')}
        error={errors.fullName}
        icon={<User size={20} color={colors.inkMuted} />}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <TextField
        ref={emailRef}
        label="Email"
        placeholder="you@example.com"
        value={values.email}
        onChangeText={set('email')}
        error={errors.email}
        icon={<Mail size={20} color={colors.inkMuted} />}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        returnKeyType="next"
        onSubmitEditing={() => mobileRef.current?.focus()}
      />
      <TextField
        ref={mobileRef}
        label="Mobile number"
        placeholder="10-digit mobile"
        value={values.mobile}
        onChangeText={(t) => set('mobile')(t.replace(/\D/g, '').slice(0, 10))}
        error={errors.mobile}
        icon={<Phone size={20} color={colors.inkMuted} />}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        maxLength={10}
        returnKeyType="next"
        onSubmitEditing={() => dobRef.current?.focus()}
      />
      <TextField
        ref={dobRef}
        label="Date of birth"
        placeholder="DD/MM/YYYY"
        value={values.dateOfBirth}
        onChangeText={set('dateOfBirth')}
        error={errors.dateOfBirth}
        icon={<Calendar size={20} color={colors.inkMuted} />}
        keyboardType="number-pad"
        autoComplete="birthdate-full"
        maxLength={10}
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextField
        ref={passwordRef}
        label="Password"
        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        value={values.password}
        onChangeText={set('password')}
        error={errors.password}
        icon={<Lock size={20} color={colors.inkMuted} />}
        password
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      <TextField
        ref={confirmRef}
        label="Confirm password"
        placeholder="Re-enter password"
        value={values.confirmPassword}
        onChangeText={set('confirmPassword')}
        error={errors.confirmPassword}
        icon={<Lock size={20} color={colors.inkMuted} />}
        password
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <Pressable
        onPress={() => setAccepted((a) => !a)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        className="mb-6 flex-row items-start"
      >
        <View
          className={`mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded border ${accepted ? 'border-navy bg-navy' : 'border-ink-faint bg-white'}`}
        >
          {accepted ? <Check size={14} color={colors.white} /> : null}
        </View>
        <Text className="flex-1 text-sm text-ink-muted">
          I agree to the{' '}
          <Text className="font-semibold text-brand-blue" onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)}>
            Terms & Conditions
          </Text>{' '}
          and{' '}
          <Text
            className="font-semibold text-brand-blue"
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </Pressable>

      <Button title="Create Account" onPress={submit} loading={isLoading} />

      <View className="mt-8 flex-row justify-center">
        <Text className="text-ink-muted">Already have an account? </Text>
        <Pressable onPress={() => router.replace('/login')} accessibilityRole="link" hitSlop={8}>
          <Text className="font-semibold text-brand-blue">Sign In</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
