import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { CreditCard } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { RecordDetails } from '@/components/RecordDetails';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorBanner, ErrorView, LoadingView } from '@/components/ui/StateViews';
import { pickNumber, pickString } from '@/lib/fields';
import { formatCurrency } from '@/lib/format';
import { findPaymentUrl, isPaid, paymentStatusLabel } from '@/lib/payments';
import {
  useCreatePaymentOrderMutation,
  useCreatePaymentRequestMutation,
  useDealDetailQuery,
  usePaymentStatusQuery,
  useProfileQuery,
} from '@/store/api/bondsAddaApi';
import { getErrorMessage } from '@/store/api/baseQuery';
import { useCustomerId, useSession } from '@/store/hooks';
import { colors } from '@/theme/colors';

const AMOUNT_KEYS = ['ConsiderationStamp', 'TotalConsideration', 'TotalAmount', 'GrossConsideration', 'Amount', 'DealValue'];

export default function DealDetailScreen() {
  const { id, productId = '' } = useLocalSearchParams<{ id: string; productId?: string }>();
  const customerId = useCustomerId();
  const session = useSession();
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const inFlight = useRef(false);

  const deal = useDealDetailQuery({ dealConfirmationId: id, customerId, productId });
  const status = usePaymentStatusQuery({ dealId: id });
  const profile = useProfileQuery({ customerId });
  const [createPaymentRequest] = useCreatePaymentRequestMutation();
  const [createPaymentOrder] = useCreatePaymentOrderMutation();

  if (deal.isLoading) return <LoadingView label="Loading deal…" />;
  if (!deal.data) return <ErrorView error={deal.error} onRetry={deal.refetch} />;

  const record = deal.data;
  const dealStatus = pickString(record, 'Status', 'DealStatus');
  const amount = pickNumber(record, ...AMOUNT_KEYS);
  const quantity = pickString(record, 'Quantity', 'Qty', 'NoOfBonds');
  const payment = status.data ? paymentStatusLabel(status.data) : null;
  const paid = isPaid(payment) || isPaid(pickString(record, 'PaymentStatus'));
  const bondName = pickString(record, 'ProductName', 'Security', 'BondName') ?? 'Bond deal';

  const pay = async () => {
    if (inFlight.current) return;
    setPayError(null);

    const customerName = pickString(profile.data, 'FullName', 'CustomerName', 'Name') ?? session?.fullName;
    const email = pickString(profile.data, 'Email', 'EmailId', 'EmailID') ?? session?.email;
    const mobile = pickString(profile.data, 'Mobile', 'MobileNo', 'MobileNumber') ?? session?.mobile;
    if (!amount || !quantity) {
      setPayError('Payment details for this deal are incomplete. Please contact support.');
      return;
    }
    if (!customerName || !email || !mobile) {
      setPayError('Your name, email and mobile number are required for payment. Please update your profile.');
      return;
    }

    inFlight.current = true;
    setPaying(true);
    try {
      // A payment request exists once paymentStatus resolves; only create one if it does not.
      let dealId = id;
      if (!status.data) {
        const request = await createPaymentRequest({ dealConfirmationId: id, customerId }).unwrap();
        dealId = pickString(request.data, 'DealId', 'DealConfirmationId') ?? id;
      }
      const order = await createPaymentOrder({
        dealId,
        qty: quantity,
        amount: amount.toFixed(2),
        customerName,
        email,
        mobile,
      }).unwrap();

      const url = findPaymentUrl(order.data);
      if (url) {
        await WebBrowser.openBrowserAsync(url, { dismissButtonStyle: 'close' });
        // The user is back from checkout; refresh the authoritative status.
        status.refetch();
        deal.refetch();
      } else {
        Alert.alert('Payment initiated', order.message ?? 'Follow the payment link sent to your email to complete payment.');
        status.refetch();
      }
    } catch (error) {
      setPayError(getErrorMessage(error, 'Unable to start payment. Please try again.'));
    } finally {
      inFlight.current = false;
      setPaying(false);
    }
  };

  return (
    <Screen
      header={<ScreenHeader title={`Deal #${id}`} />}
      refreshing={deal.isFetching || status.isFetching}
      onRefresh={() => {
        deal.refetch();
        status.refetch();
      }}
      footer={
        paid ? undefined : (
          <Button
            title={amount ? `Pay ${formatCurrency(amount, true)}` : 'Pay Now'}
            variant="success"
            loading={paying}
            onPress={pay}
            leftIcon={<CreditCard size={18} color={colors.white} />}
          />
        )
      }
    >
      <Card className="mt-2">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-lg font-bold text-ink">{bondName}</Text>
            {quantity ? <Text className="text-sm text-ink-muted">Quantity: {quantity}</Text> : null}
          </View>
          <StatusBadge status={dealStatus} fallback="Pending" />
        </View>
        {amount ? <Text className="mt-3 text-2xl font-bold text-ink">{formatCurrency(amount, true)}</Text> : null}
      </Card>

      <Card className="mt-4">
        <View className="flex-row items-center justify-between">
          <Text className="font-semibold text-ink">Payment</Text>
          {status.isLoading ? (
            <Text className="text-ink-muted">Checking…</Text>
          ) : (
            <StatusBadge status={payment ?? (paid ? 'Paid' : null)} fallback="Not initiated" />
          )}
        </View>
        {status.data ? (
          <View className="mt-2">
            <RecordDetails record={status.data} exclude={['Status', 'PaymentStatus']} />
          </View>
        ) : null}
      </Card>

      <Text className="mb-2 mt-6 text-lg font-bold text-ink">Deal details</Text>
      <Card className="py-1">
        <RecordDetails
          record={record}
          exclude={['Status', 'DealStatus', 'ProductName', 'CustomerId']}
          order={[
            'DealConfirmationId',
            'DealDate',
            'SattlementDate',
            'Rate',
            'Quantity',
            'PrincipalAmount',
            'AccuredInterest',
            'StampDuty',
            'GrossConsideration',
            'ConsiderationStamp',
          ]}
        />
      </Card>

      <View className="mt-4">
        <ErrorBanner message={payError} />
      </View>
    </Screen>
  );
}
