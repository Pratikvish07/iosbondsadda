import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

interface ScreenProps {
  children: ReactNode;
  /** Rendered above the scroll area, inside the top safe-area inset. */
  header?: ReactNode;
  /** Rendered below the scroll area, inside the bottom safe-area inset (e.g. a CTA). */
  footer?: ReactNode;
  scroll?: boolean;
  keyboard?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Skip the top inset when the header draws its own background into the status bar. */
  edgeToEdgeTop?: boolean;
  /** Skip the bottom inset (tab screens: the tab bar already handles it). */
  insetBottom?: boolean;
  className?: string;
  contentClassName?: string;
}

export function Screen({
  children,
  header,
  footer,
  scroll = true,
  keyboard = false,
  refreshing,
  onRefresh,
  edgeToEdgeTop = false,
  insetBottom = true,
  className = 'bg-white',
  contentClassName = 'px-5 pb-8',
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName={contentClassName}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.navy} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View className={`flex-1 ${contentClassName}`}>{children}</View>
  );

  const content = (
    <>
      {header}
      {body}
      {footer ? (
        <View
          className="border-t border-line bg-white px-5 pt-3"
          style={{ paddingBottom: insetBottom ? Math.max(insets.bottom, 12) : 12 }}
        >
          {footer}
        </View>
      ) : null}
    </>
  );

  return (
    <View
      className={`flex-1 ${className}`}
      style={{
        paddingTop: edgeToEdgeTop ? 0 : insets.top,
        paddingBottom: footer || !insetBottom ? 0 : insets.bottom,
      }}
    >
      {keyboard ? (
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </View>
  );
}
