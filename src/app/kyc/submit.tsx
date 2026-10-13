import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { DocumentField } from '@/components/forms/DocumentField';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorBanner } from '@/components/ui/StateViews';
import { TextField } from '@/components/ui/TextField';
import type { PickedDocument } from '@/lib/files';
import { hasErrors, isAadhaar, isDematAccount, isPan, required, rule, validate } from '@/lib/validation';
import { useSubmitKycMutation } from '@/store/api/bondsAddaApi';
import { getErrorMessage } from '@/store/api/baseQuery';
import { useCustomerId } from '@/store/hooks';

type Values = { panNumber: string; adharNumber: string; dematAccountNumber: string; clientId: string };

export default function SubmitKycScreen() {
  const customerId = useCustomerId();
  const [values, setValues] = useState<Values>({ panNumber: '', adharNumber: '', dematAccountNumber: '', clientId: '' });
  const [cml, setCml] = useState<PickedDocument | null>(null);
  const [errors, setErrors] = useState<Partial<Values & { cml: string }>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitKyc, { isLoading }] = useSubmitKycMutation();

  const set = (key: keyof Values, transform: (t: string) => string = (t) => t) => (text: string) => {
    setValues((v) => ({ ...v, [key]: transform(text) }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async () => {
    setFormError(null);
    const found: Partial<Values & { cml: string }> = validate(values, {
      panNumber: [required('PAN'), rule(isPan, 'Enter a valid PAN, e.g. ABCDE1234F')],
      adharNumber: [required('Aadhaar number'), rule(isAadhaar, 'Enter a valid 12-digit Aadhaar number')],
      dematAccountNumber: [
        required('Demat account number'),
        rule(isDematAccount, 'Enter your 16-character demat (BO) account number'),
      ],
      clientId: [required('Client ID'), rule((v) => /^[0-9A-Za-z]{6,16}$/.test(v.trim()), 'Enter a valid client ID')],
    });
    if (!cml) found.cml = 'Upload your Client Master List (CML)';
    setErrors(found);
    if (hasErrors(found) || !cml) return;

    try {
      const result = await submitKyc({
        customerId,
        panNumber: values.panNumber.trim().toUpperCase(),
        panDescription: 'PAN submitted from mobile app',
        adharNumber: values.adharNumber.replace(/\s/g, ''),
        adharDescription: 'Aadhaar submitted from mobile app',
        dematAccountNumber: values.dematAccountNumber.replace(/\s/g, '').toUpperCase(),
        clientId: values.clientId.trim(),
        dematDescription: 'Demat details submitted from mobile app',
        cmlFileBase64: cml.base64,
        cmlFileName: cml.name,
      }).unwrap();
      Alert.alert('KYC submitted', result.message ?? 'Your documents have been submitted for verification.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to submit KYC. Please try again.'));
    }
  };

  return (
    <Screen
      keyboard
      header={<ScreenHeader title="Submit KYC" />}
      footer={<Button title="Submit for Verification" onPress={submit} loading={isLoading} />}
    >
      <Text className="mb-5 mt-2 text-ink-muted">
        Required by SEBI before you can invest. Your details are sent securely and used only for verification.
      </Text>
      <ErrorBanner message={formError} />

      <TextField
        label="PAN"
        placeholder="ABCDE1234F"
        value={values.panNumber}
        onChangeText={set('panNumber', (t) => t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
        error={errors.panNumber}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={10}
      />
      <TextField
        label="Aadhaar number"
        placeholder="12-digit Aadhaar"
        value={values.adharNumber}
        onChangeText={set('adharNumber', (t) => t.replace(/\D/g, '').slice(0, 12))}
        error={errors.adharNumber}
        keyboardType="number-pad"
        maxLength={12}
        hint="Only used for KYC verification; never shown in full in the app."
      />
      <TextField
        label="Demat account (BO ID)"
        placeholder="16-character BO ID"
        value={values.dematAccountNumber}
        onChangeText={set('dematAccountNumber', (t) => t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16))}
        error={errors.dematAccountNumber}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={16}
      />
      <TextField
        label="Client ID"
        placeholder="Client ID from your broker"
        value={values.clientId}
        onChangeText={set('clientId', (t) => t.replace(/[^0-9A-Za-z]/g, '').slice(0, 16))}
        error={errors.clientId}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <DocumentField
        label="Client Master List (CML)"
        value={cml}
        onChange={(doc) => {
          setCml(doc);
          if (errors.cml) setErrors((e) => ({ ...e, cml: undefined }));
        }}
        error={errors.cml}
      />
    </Screen>
  );
}
