import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, CalendarClock, ChevronRight, ShieldAlert } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { BondLogo } from '@/components/bonds/BondLogo';
import { QuantityStepper } from '@/components/bonds/QuantityStepper';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, Divider, InfoRow } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorBanner, ErrorView, LoadingView } from '@/components/ui/StateViews';
import { issuerName, ratingTone } from '@/lib/bonds';
import { bondTerms, quoteDeal } from '@/lib/bondMath';
import { pickString } from '@/lib/fields';
import { clean, formatCurrency, formatDate, formatPercent, parseApiDate, toApiDate } from '@/lib/format';
import { useCreateDealMutation, useInvestmentPreviewQuery } from '@/store/api/bondsAddaApi';
import { getErrorMessage } from '@/store/api/baseQuery';
import { useCustomerId } from '@/store/hooks';
import { colors } from '@/theme/colors';

export default function InvestmentPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customerId = useCustomerId();
  const [quantity, setQuantity] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitting = useRef(false);

  const preview = useInvestmentPreviewQuery({ productId: id, customerId });
  const [createDeal, { isLoading: creating }] = useCreateDealMutation();

  const product = preview.data?.Product;
  const terms = useMemo(() => (product ? bondTerms(product) : null), [product]);
  const lastInterestDate = preview.data?.LastInterestDate ?? null;
  const quote = useMemo(
    () => (terms ? quoteDeal(terms, quantity, parseApiDate(lastInterestDate)) : null),
    [terms, quantity, lastInterestDate],
  );

  if (preview.isLoading) return <LoadingView label="Preparing your investment…" />;
  if (!preview.data || !product || !terms || !quote) {
    return <ErrorView error={preview.error} onRetry={preview.refetch} />;
  }

  const name = issuerName(product);
  const rating = clean(product.CreditRating);
  const canInvest = preview.data.CanInvestNow;
  const maxUnits = terms.availableUnits !== null && terms.availableUnits > 0 ? terms.availableUnits : undefined;

  const placeDeal = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setSubmitError(null);
    try {
      const result = await createDeal({
        customerId,
        productId: product.ProductId,
        rate: terms.price.toFixed(2),
        dealDate: toApiDate(quote.dealDate),
        sattlementDate: toApiDate(quote.settlementDate),
        noOfDays: String(quote.accruedDays),
        quantity: String(quote.quantity),
        principalAmount: quote.principal.toFixed(2),
        accuredInterest: quote.accruedInterest.toFixed(2),
        stampDuty: quote.stampDuty.toFixed(2),
        considerationStamp: quote.totalPayable.toFixed(2),
        dealValue: quote.dealValue.toFixed(2),
        lastIpDate: quote.lastInterestDate ? toApiDate(quote.lastInterestDate) : '',
        grossConsideration: quote.grossConsideration.toFixed(2),
      }).unwrap();

      const dealId = pickString(result.data, 'DealConfirmationId', 'DealConfirmationID', 'DealId', 'Id');
      if (dealId) {
        router.replace({ pathname: '/deals/[id]', params: { id: dealId, productId: product.ProductId } });
      } else {
        Alert.alert('Deal placed', result.message ?? 'Your deal has been created. Track it under Deals.', [
          { text: 'View deals', onPress: () => router.replace('/deals') },
        ]);
      }
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Unable to place your deal. Please try again.'));
    } finally {
      submitting.current = false;
    }
  };

  const confirm = () =>
    Alert.alert(
      'Confirm investment',
      `${quote.quantity} unit${quote.quantity > 1 ? 's' : ''} of ${name}\nAmount payable: ${formatCurrency(
        quote.totalPayable,
        true,
      )}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: placeDeal },
      ],
    );

  return (
    <Screen
      keyboard
      header={<ScreenHeader title="Investment Preview" />}
      refreshing={preview.isFetching}
      onRefresh={preview.refetch}
      footer={
        canInvest ? (
          <Button
            title="Proceed to Invest"
            variant="success"
            loading={creating}
            onPress={confirm}
            rightIcon={<ArrowRight size={18} color={colors.white} />}
          />
        ) : (
          <Button title="Complete KYC to Invest" onPress={() => router.push('/kyc')} />
        )
      }
    >
      <Card className="mt-2 flex-row items-center">
        <BondLogo uri={product.ImageUrl} name={name} />
        <View className="ml-3 flex-1">
          <Text className="font-bold text-ink" numberOfLines={1}>
            {name}
          </Text>
          <View className="mt-1 flex-row gap-1.5">
            {rating ? <Badge label={rating} tone={ratingTone(rating)} /> : null}
            <Badge label={clean(product.PaymentType) || 'Interest'} tone="info" />
          </View>
        </View>
        <Text className="font-bold text-success">{formatPercent(terms.couponRate)} p.a.</Text>
      </Card>

      {!canInvest ? (
        <Pressable
          onPress={() => router.push('/kyc')}
          className="mt-4 flex-row items-center rounded-2xl bg-warning-light px-4 py-3"
          accessibilityRole="button"
        >
          <ShieldAlert size={22} color={colors.warning} />
          <Text className="ml-3 flex-1 text-sm text-ink">
            Investing is unlocked once your KYC and bank details are verified (status:{' '}
            {preview.data.Kyc?.OverallStatus ?? 'Pending'}).
          </Text>
          <ChevronRight size={18} color={colors.inkMuted} />
        </Pressable>
      ) : null}

      <Text className="mb-2 mt-6 font-semibold text-ink">Number of units</Text>
      <QuantityStepper value={quantity} onChange={setQuantity} max={maxUnits} />
      <Text className="mt-2 text-center text-sm text-ink-muted">
        Face value {formatCurrency(terms.faceValue)} per unit · Price {terms.price.toFixed(2)}
        {maxUnits ? ` · ${maxUnits.toLocaleString('en-IN')} available` : ''}
      </Text>

      <Card className="mt-6 py-1">
        <InfoRow label="Principal (face value)" value={formatCurrency(quote.principal, true)} />
        <Divider />
        <InfoRow label={`Deal value @ ${terms.price.toFixed(2)}`} value={formatCurrency(quote.dealValue, true)} />
        <Divider />
        <InfoRow
          label={`Accrued interest (${quote.accruedDays} day${quote.accruedDays === 1 ? '' : 's'})`}
          value={formatCurrency(quote.accruedInterest, true)}
        />
        <Divider />
        <InfoRow label="Stamp duty" value={formatCurrency(quote.stampDuty, true)} />
        <Divider />
        <InfoRow emphasis label="Total payable" value={formatCurrency(quote.totalPayable, true)} />
      </Card>

      <Card className="mt-4 py-1">
        <InfoRow label="Expected annual interest" value={formatCurrency(quote.annualInterest)} />
        <Divider />
        <InfoRow label="Total interest (till maturity)" value={formatCurrency(quote.totalInterestToMaturity)} />
        <Divider />
        <InfoRow emphasis label="Total maturity value" value={formatCurrency(quote.maturityValue)} />
        <Divider />
        <InfoRow label="Settlement date" value={formatDate(quote.settlementDate)} />
      </Card>

      <Pressable
        onPress={() =>
          router.push({ pathname: '/bonds/[id]/cash-flow', params: { id: product.ProductId, qty: String(quantity) } })
        }
        accessibilityRole="button"
        className="mt-4 flex-row items-center rounded-2xl border border-line px-4 py-4 active:bg-surface"
      >
        <CalendarClock size={20} color={colors.brandBlue} />
        <Text className="ml-3 flex-1 font-semibold text-ink">View cash-flow schedule</Text>
        <ChevronRight size={18} color={colors.inkMuted} />
      </Pressable>

      <View className="mt-4">
        <ErrorBanner message={submitError} />
      </View>
      <Text className="mt-2 text-center text-xs text-ink-faint">
        This is an indicative calculation. Final values are confirmed in your deal confirmation.
      </Text>
    </Screen>
  );
}
