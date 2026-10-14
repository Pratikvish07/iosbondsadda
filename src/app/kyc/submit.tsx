import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { DocumentField } from '@/components/forms/DocumentField';
import { statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorBanner, ErrorView, LoadingView } from '@/components/ui/StateViews';
import { TextField } from '@/components/ui/TextField';
import { notify } from '@/lib/dialogs';
import type { PickedDocument } from '@/lib/files';
import { maskTail } from '@/lib/format';
import { hasErrors, isAadhaar, isDematAccount, isPan, required, rule, validate, type Validator } from '@/lib/validation';
import { useKycStatusQuery, useSubmitKycMutation } from '@/store/api/bondsAddaApi';
import type { KycStatus } from '@/store/api/types';
import { getErrorMessage } from '@/store/api/baseQuery';
import { useCustomerId } from '@/store/hooks';

type Values = { panNumber: string; adharNumber: string; dematAccountNumber: string; clientId: string };

export default function SubmitKycScreen() {
  const customerId = useCustomerId();
  const { data, error, isLoading, refetch } = useKycStatusQuery({ customerId });

  if (isLoading) return <LoadingView />;
  if (!data) return <ErrorView error={error} onRetry={refetch} />;
  // Mount the form only once status is known, so approved values can seed its initial state.
  return <KycForm customerId={customerId} status={data} />;
}

function KycForm({ customerId, status }: { customerId: string; status: KycStatus }) {
  const approved = (s: string | null) => statusTone(s) === 'success';
  // Verified documents cannot be changed from the app; they are resent unchanged because the
  // endpoint takes PAN, Aadhaar and demat together.
  const panLocked = approved(status.PanStatus) && !!status.PanNumber;
  const aadhaarLocked = approved(status.AdharStatus) && !!status.AdharNumber;
  const dematOnly = panLocked && aadhaarLocked;

  const [values, setValues] = useState<Values>({
    panNumber: status.PanNumber ?? '',
    adharNumber: status.AdharNumber ?? '',
    dematAccountNumber: approved(status.DemateStatus) ? '' : (status.DemateAccountNumber ?? ''),
    clientId: approved(status.DemateStatus) ? '' : (status.ClientId ?? ''),
  });
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
    const none: Validator[] = [];
    const found: Partial<Values & { cml: string }> = validate(values, {
      panNumber: panLocked ? none : [required('PAN'), rule(isPan, 'Enter a valid PAN, e.g. ABCDE1234F')],
      adharNumber: aadhaarLocked
        ? none
        : [required('Aadhaar number'), rule(isAadhaar, 'Enter a valid 12-digit Aadhaar number')],
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
        panNumber: panLocked ? status.PanNumber! : values.panNumber.trim().toUpperCase(),
        panDescription: 'PAN submitted from mobile app',
        adharNumber: aadhaarLocked ? status.AdharNumber! : values.adharNumber.replace(/\s/g, ''),
        adharDescription: 'Aadhaar submitted from mobile app',
        dematAccountNumber: values.dematAccountNumber.replace(/\s/g, '').toUpperCase(),
        clientId: values.clientId.trim(),
        dematDescription: 'Demat details submitted from mobile app',
        cmlFileBase64: cml.base64,
        cmlFileName: cml.name,
      }).unwrap();
      await notify(
        dematOnly ? 'Demat details submitted' : 'KYC submitted',
        result.message ?? 'Your details have been submitted for verification.',
      );
      router.back();
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to submit KYC. Please try again.'));
    }
  };

  return (
    <Screen
      keyboard
      header={<ScreenHeader title={dematOnly ? 'Add Demat Details' : 'Submit KYC'} />}
      footer={<Button title="Submit for Verification" onPress={submit} loading={isLoading} />}
    >
      <Text className="mb-5 mt-2 text-ink-muted">
        {dematOnly
          ? 'Your PAN and Aadhaar are already verified. Add the demat account where your bonds will be credited.'
          : 'Required by SEBI before you can invest. Your details are sent securely and used only for verification.'}
      </Text>
      <ErrorBanner message={formError} />

      {panLocked ? (
        <TextField label="PAN" value={status.PanNumber!} editable={false} hint="Verified" />
      ) : (
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
      )}
      {aadhaarLocked ? (
        <TextField label="Aadhaar number" value={maskTail(status.AdharNumber)} editable={false} hint="Verified" />
      ) : (
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
      )}
      <TextField
        label="Demat account (BO ID)"
        placeholder="16-character BO ID"
        value={values.dematAccountNumber}
        onChangeText={set('dematAccountNumber', (t) => t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16))}
        error={errors.dematAccountNumber}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={16}
        hint="DP ID + Client ID, e.g. 1201234567890123 (CDSL) or IN30012345678901 (NSDL)"
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
        hint="Download it from your broker's app or website · PDF, JPG or PNG · up to 2.5 MB"
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
