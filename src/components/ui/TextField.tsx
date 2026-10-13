import { Eye, EyeOff } from 'lucide-react-native';
import { forwardRef, useState, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/theme/colors';

interface TextFieldProps extends Omit<TextInputProps, 'className'> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  /** Adds a show/hide toggle and hides the value by default. */
  password?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, icon, password = false, editable = true, ...inputProps },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(password);

  const border = error ? 'border-danger' : focused ? 'border-brand-blue' : 'border-line';

  return (
    <View className="mb-4">
      {label ? <Text className="mb-1.5 text-sm font-medium text-ink">{label}</Text> : null}
      <View
        className={`h-14 flex-row items-center rounded-xl border bg-white px-4 ${border} ${editable ? '' : 'bg-surface'}`}
      >
        {icon ? <View className="mr-3">{icon}</View> : null}
        <TextInput
          {...inputProps}
          ref={ref}
          className="h-full flex-1 text-base text-ink"
          placeholderTextColor={colors.inkFaint}
          secureTextEntry={hidden}
          editable={editable}
          accessibilityLabel={label ?? inputProps.placeholder}
          accessibilityHint={error}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
        />
        {password ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            {hidden ? <Eye size={20} color={colors.inkMuted} /> : <EyeOff size={20} color={colors.inkMuted} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="mt-1 text-xs text-danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text className="mt-1 text-xs text-ink-muted">{hint}</Text>
      ) : null}
    </View>
  );
});
