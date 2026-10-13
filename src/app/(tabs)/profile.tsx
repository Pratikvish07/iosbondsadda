import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  Briefcase,
  ChevronRight,
  FileText,
  Handshake,
  IdCard,
  Landmark,
  LifeBuoy,
  LogOut,
  Receipt,
  Shield,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';

import { StatusBadge } from '@/components/ui/Badge';
import { Card, Divider } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { PRIVACY_POLICY_URL, SUPPORT_EMAIL, TERMS_URL } from '@/config/env';
import { pickString } from '@/lib/fields';
import { initials } from '@/lib/format';
import { signOut } from '@/store';
import { useKycStatusQuery, useProfileQuery } from '@/store/api/bondsAddaApi';
import { useAppDispatch, useCustomerId, useSession } from '@/store/hooks';
import { colors } from '@/theme/colors';

function MenuRow({
  icon: Icon,
  label,
  onPress,
  right,
  danger = false,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  right?: ReactNode;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-row items-center py-3.5 active:opacity-60"
    >
      <Icon size={20} color={danger ? colors.danger : colors.ink} />
      <Text className={`ml-3 flex-1 text-base ${danger ? 'text-danger' : 'text-ink'}`}>{label}</Text>
      {right}
      {!danger ? <ChevronRight size={18} color={colors.inkFaint} /> : null}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const customerId = useCustomerId();
  const session = useSession();
  const profile = useProfileQuery({ customerId });
  const kyc = useKycStatusQuery({ customerId });

  const name = pickString(profile.data, 'FullName', 'CustomerName', 'Name') ?? session?.fullName ?? 'Investor';
  const email = pickString(profile.data, 'Email', 'EmailId', 'EmailID') ?? session?.email;
  const mobile = pickString(profile.data, 'Mobile', 'MobileNo', 'MobileNumber') ?? session?.mobile;

  const go = (href: Href) => () => router.push(href);

  const confirmSignOut = () =>
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => dispatch(signOut()) },
    ]);

  const requestDeletion = () =>
    Alert.alert(
      'Delete account',
      `We will email ${SUPPORT_EMAIL} to request permanent deletion of your BondsAdda account and personal data. Records we must retain under SEBI and tax regulations are kept only for the required period.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            Linking.openURL(
              `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Account deletion request')}&body=${encodeURIComponent(
                `Please delete my BondsAdda account.\n\nCustomer ID: ${customerId}\nRegistered email: ${email ?? ''}\nRegistered mobile: ${mobile ?? ''}`,
              )}`,
            ).catch(() => Alert.alert('No email app', `Please write to ${SUPPORT_EMAIL} from your registered email.`)),
        },
      ],
    );

  return (
    <Screen
      insetBottom={false}
      header={<ScreenHeader title="Profile" showBack={false} />}
      refreshing={profile.isFetching}
      onRefresh={() => {
        profile.refetch();
        kyc.refetch();
      }}
    >
      <View className="mt-2 flex-row items-center">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
          <Text className="text-xl font-bold text-indigo-700">{initials(name)}</Text>
        </View>
        <View className="ml-4 flex-1">
          <Text className="text-lg font-bold text-ink">{name}</Text>
          {email ? <Text className="text-sm text-ink-muted">{email}</Text> : null}
          {mobile ? <Text className="text-sm text-ink-muted">+91 {mobile}</Text> : null}
        </View>
      </View>

      <Card className="mt-6 py-1">
        <MenuRow
          icon={IdCard}
          label="KYC Details"
          onPress={go('/kyc')}
          right={
            <View className="mr-2">
              <StatusBadge status={kyc.data?.OverallStatus} fallback="Pending" />
            </View>
          }
        />
        <Divider />
        <MenuRow icon={Landmark} label="Bank Details" onPress={go('/kyc/bank')} />
        <Divider />
        <MenuRow icon={Handshake} label="My Deals" onPress={go('/deals')} />
        <Divider />
        <MenuRow icon={Briefcase} label="My Portfolio" onPress={go('/portfolio')} />
        <Divider />
        <MenuRow icon={Receipt} label="Payment History" onPress={go('/payments')} />
      </Card>

      <Card className="mt-4 py-1">
        <MenuRow icon={Shield} label="Privacy Policy" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)} />
        <Divider />
        <MenuRow icon={FileText} label="Terms & Conditions" onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} />
        <Divider />
        <MenuRow
          icon={LifeBuoy}
          label="Contact Support"
          onPress={() =>
            Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => Alert.alert('Support', SUPPORT_EMAIL))
          }
        />
      </Card>

      <Card className="mt-4 py-1">
        <MenuRow icon={LogOut} label="Sign Out" onPress={confirmSignOut} danger />
        <Divider />
        <MenuRow icon={Trash2} label="Delete Account" onPress={requestDeletion} danger />
      </Card>

      <Text className="mt-6 text-center text-xs text-ink-faint">
        BondsAdda v{Constants.expoConfig?.version ?? '1.0.0'}
      </Text>
    </Screen>
  );
}
