import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

type Variant = 'primary' | 'success' | 'outline' | 'ghost' | 'danger';

const containerClass: Record<Variant, string> = {
  primary: 'bg-navy active:bg-navy-dark',
  success: 'bg-success active:bg-success-dark',
  outline: 'border border-line bg-white active:bg-surface',
  ghost: 'bg-transparent active:bg-surface',
  danger: 'border border-danger-light bg-white active:bg-danger-light',
};

const textClass: Record<Variant, string> = {
  primary: 'text-white',
  success: 'text-white',
  outline: 'text-ink',
  ghost: 'text-brand-blue',
  danger: 'text-danger',
};

const spinnerColor: Record<Variant, string> = {
  primary: colors.white,
  success: colors.white,
  outline: colors.navy,
  ghost: colors.brandBlue,
  danger: colors.danger,
};

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: 'md' | 'sm';
  className?: string;
  accessibilityHint?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  size = 'md',
  className = '',
  accessibilityHint,
}: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={`flex-row items-center justify-center rounded-xl ${size === 'md' ? 'h-14 px-5' : 'h-10 px-4'} ${containerClass[variant]} ${inactive ? 'opacity-60' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor[variant]} />
      ) : (
        <View className="flex-row items-center gap-2">
          {leftIcon}
          <Text className={`${size === 'md' ? 'text-base' : 'text-sm'} font-semibold ${textClass[variant]}`}>
            {title}
          </Text>
          {rightIcon}
        </View>
      )}
    </Pressable>
  );
}
