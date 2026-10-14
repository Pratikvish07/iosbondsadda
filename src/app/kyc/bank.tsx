import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { DocumentField } from '@/components/forms/DocumentField';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorBanner } from '@/components/ui/StateViews';
import { TextField } from '@/components/ui/TextField';
import { notify } from '@/lib/dialogs';
import type { PickedDocument } from '@/lib/files';
import { hasErrors, isBankAccount, isIfsc, required, rule, validate } from '@/lib/validation';
import { useSubmitBankMutation } from '@/store/api/bondsAddaApi';
import { getErrorMessage } from '@/store/api/baseQuery';
import { useCustomerId, useSession } from '@/store/hooks';

type Values = {
  bankHolderName: string;
  bankName: string;
  bankAccountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
};

export default function BankDetailsScreen() {
  const customerId = useCustomerId();
  const session = useSession();
  const [values, setValues] = useState<Values>({
    bankHolderName: session?.fullName ?? '',
    bankName: '',
    bankAccountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
  });
  const [doc, setDoc] = useState<PickedDocument | null>(null);
  const [errors, setErrors] = useState<Partial<Values & { doc: string }>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitBank, { isLoading }] = useSubmitBankMutation();

  const set = (key: keyof Values, transform: (t: string) => string = (t) => t) => (text: string) => {
    setValues((v) => ({ ...v, [key]: transform(text) }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async () => {
    setFormError(null);
    const found: Partial<Values & { doc: string }> = validate(values, {
      bankHolderName: [required('Account holder name')],
      bankName: [required('Bank name')],
      bankAccountNumber: [required('Account number'), rule(isBankAccount, 'Enter a valid account number (9–18 digits)')],
      confirmAccountNumber: [
        required('Confirm account number'),
        rule((v) => v === values.bankAccountNumber, 'Account numbers do not match'),
      ],
      ifscCode: [required('IFSC'), rule(isIfsc, 'Enter a valid IFSC, e.g. HDFC0001234')],
    });
    if (!doc) found.doc = 'Upload a cancelled cheque or bank statement';
    setErrors(found);
    if (hasErrors(found) || !doc) return;

    try {
      const result = await submitBank({
        customerId,
        bankAccountNumber: values.bankAccountNumber.trim(),
        bankHolderName: values.bankHolderName.trim(),
        bankName: values.bankName.trim(),
        ifscCode: values.ifscCode.trim().toUpperCase(),
        bankDocBase64: doc.base64,
        bankDocFileName: doc.name,
      }).unwrap();
      await notify('Bank details submitted', result.message ?? 'Your bank details have been submitted for verification.');
      router.back();
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to submit bank details. Please try again.'));
    }
  };

  return (
    <Screen
      keyboard
      header={<ScreenHeader title="Bank Details" />}
      footer={<Button title="Submit Bank Details" onPress={submit} loading={isLoading} />}
    >
      <Text className="mb-5 mt-2 text-ink-muted">
        Interest and maturity payouts are credited to this account. It must be in your name.
      </Text>
      <ErrorBanner message={formError} />

      <TextField
        label="Account holder name"
        value={values.bankHolderName}
        onChangeText={set('bankHolderName')}
        error={errors.bankHolderName}
        autoCapitalize="words"
        autoComplete="name"
      />
      <TextField
        label="Bank name"
        placeholder="e.g. HDFC Bank"
        value={values.bankName}
        onChangeText={set('bankName')}
        error={errors.bankName}
        autoCapitalize="words"
      />
      <TextField
        label="Account number"
        value={values.bankAccountNumber}
        onChangeText={set('bankAccountNumber', (t) => t.replace(/\D/g, '').slice(0, 18))}
        error={errors.bankAccountNumber}
        keyboardType="number-pad"
        secureTextEntry
        autoComplete="off"
      />
      <TextField
        label="Confirm account number"
        value={values.confirmAccountNumber}
        onChangeText={set('confirmAccountNumber', (t) => t.replace(/\D/g, '').slice(0, 18))}
        error={errors.confirmAccountNumber}
        keyboardType="number-pad"
        autoComplete="off"
        contextMenuHidden
      />
      <TextField
        label="IFSC"
        placeholder="HDFC0001234"
        value={values.ifscCode}
        onChangeText={set('ifscCode', (t) => t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
        error={errors.ifscCode}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={11}
      />
      <DocumentField
        label="Cancelled cheque / bank statement"
        value={doc}
        onChange={(d) => {
          setDoc(d);
          if (errors.doc) setErrors((e) => ({ ...e, doc: undefined }));
        }}
        error={errors.doc}
      />
    </Screen>
  );
}
