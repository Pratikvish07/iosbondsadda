import { router } from 'expo-router';
import { CircleCheck, Clock, CreditCard, IdCard, Landmark, ShieldAlert, Wallet, type LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { statusTone, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, Divider } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '@/components/ui/StateViews';
import { maskTail } from '@/lib/format';
import { useKycStatusQuery } from '@/store/api/bondsAddaApi';
import { useCustomerId } from '@/store/hooks';
import { colors } from '@/theme/colors';

function Row({ icon: Icon, label, detail, status }: { icon: LucideIcon; label: string; detail?: string; status: string | null }) {
  return (
    <View className="flex-row items-center py-3.5">
      <View className="h-9 w-9 items-center justify-center rounded-lg bg-success-light">
        <Icon size={18} color={colors.success} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-medium text-ink">{label}</Text>
        {detail ? <Text className="text-xs text-ink-muted">{detail}</Text> : null}
      </View>
      <StatusBadge status={status} />
    </View>
  );
}

export default function KycStatusScreen() {
  const customerId = useCustomerId();
  const { data, error, isLoading, isFetching, refetch } = useKycStatusQuery({ customerId });

  if (isLoading) return <LoadingView />;
  if (!data) return <ErrorView error={error} onRetry={refetch} />;

  const overall = statusTone(data.OverallStatus);
  const verified = overall === 'success';
  const kycSubmitted = !!(data.PanStatus || data.AdharStatus || data.DemateStatus);
  const kycEditable = !verified && statusTone(data.PanStatus) !== 'success';
  const bankEditable = statusTone(data.BankStatus) !== 'success';

  return (
    <Screen header={<ScreenHeader title="KYC Status" />} refreshing={isFetching} onRefresh={refetch}>
      <View className="mt-4 items-center">
        {verified ? (
          <CircleCheck size={64} color={colors.success} />
        ) : overall === 'danger' ? (
          <ShieldAlert size={64} color={colors.danger} />
        ) : (
          <Clock size={64} color={colors.warning} />
        )}
        <Text className="mt-3 text-2xl font-bold text-ink">
          {verified ? 'KYC Verified' : `KYC ${data.OverallStatus ?? 'Pending'}`}
        </Text>
        <Text className="mt-1 text-center text-ink-muted">
          {verified
            ? 'Your KYC has been successfully verified. You can now invest in bonds.'
            : kycSubmitted
              ? 'Your documents are under review. We will notify you once verification is complete.'
              : 'Submit your PAN, Aadhaar, demat and bank details to start investing.'}
        </Text>
      </View>

      <Card className="mt-6 py-1">
        <Row icon={CreditCard} label="PAN Card" detail={data.PanNumber ? maskTail(data.PanNumber) : undefined} status={data.PanStatus} />
        <Divider />
        <Row icon={IdCard} label="Aadhaar Card" detail={data.AdharNumber ? maskTail(data.AdharNumber) : undefined} status={data.AdharStatus} />
        <Divider />
        <Row
          icon={Wallet}
          label="Demat Details"
          detail={data.DemateAccountNumber ? maskTail(data.DemateAccountNumber) : undefined}
          status={data.DemateStatus}
        />
        <Divider />
        <Row
          icon={Landmark}
          label="Bank Account"
          detail={data.BankName ? `${data.BankName} · ${maskTail(data.BankAccountNumber)}` : undefined}
          status={data.BankStatus}
        />
      </Card>

      <View className="mt-6 gap-3">
        {kycEditable ? (
          <Button
            title={kycSubmitted ? 'Update KYC Documents' : 'Submit KYC'}
            onPress={() => router.push('/kyc/submit')}
          />
        ) : null}
        {bankEditable ? (
          <Button
            title={data.BankStatus ? 'Update Bank Details' : 'Add Bank Details'}
            variant="outline"
            onPress={() => router.push('/kyc/bank')}
          />
        ) : null}
      </View>
    </Screen>
  );
}
