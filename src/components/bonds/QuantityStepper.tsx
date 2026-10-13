import { Minus, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { colors } from '@/theme/colors';

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  // Holds in-progress typing; null means "show the committed value".
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? String(value);

  const clamp = (n: number) => Math.max(min, max !== undefined ? Math.min(max, n) : n);
  const commit = (raw: string) => {
    const n = parseInt(raw.replace(/\D/g, ''), 10);
    setDraft(null);
    onChange(clamp(Number.isFinite(n) ? n : min));
  };

  const canDec = value > min;
  const canInc = max === undefined || value < max;

  return (
    <View className="flex-row items-center">
      <Pressable
        onPress={() => canDec && onChange(value - 1)}
        disabled={!canDec}
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        className={`h-12 w-12 items-center justify-center rounded-xl border border-line ${canDec ? '' : 'opacity-40'}`}
      >
        <Minus size={20} color={colors.ink} />
      </Pressable>
      <TextInput
        value={text}
        onChangeText={(t) => setDraft(t.replace(/\D/g, '').slice(0, 7))}
        onEndEditing={(e) => commit(e.nativeEvent.text)}
        onSubmitEditing={(e) => commit(e.nativeEvent.text)}
        keyboardType="number-pad"
        returnKeyType="done"
        accessibilityLabel="Quantity"
        className="mx-3 h-12 flex-1 rounded-xl border border-line text-center text-lg font-bold text-ink"
      />
      <Pressable
        onPress={() => canInc && onChange(value + 1)}
        disabled={!canInc}
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        className={`h-12 w-12 items-center justify-center rounded-xl border border-line ${canInc ? '' : 'opacity-40'}`}
      >
        <Plus size={20} color={colors.ink} />
      </Pressable>
    </View>
  );
}
