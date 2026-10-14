import { FileText, Upload, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { DocumentPickError, formatBytes, pickDocument, type PickedDocument } from '@/lib/files';
import { colors } from '@/theme/colors';

export function DocumentField({
  label,
  hint = 'PDF, JPG or PNG · up to 2.5 MB',
  value,
  onChange,
  error,
}: {
  label: string;
  hint?: string;
  value: PickedDocument | null;
  onChange: (doc: PickedDocument | null) => void;
  error?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  const choose = async () => {
    setPickError(null);
    setBusy(true);
    try {
      const doc = await pickDocument();
      if (doc) onChange(doc);
    } catch (e) {
      setPickError(e instanceof DocumentPickError ? e.message : 'Could not open the selected file.');
    } finally {
      setBusy(false);
    }
  };

  const message = pickError ?? error;

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-ink">{label}</Text>
      {value ? (
        <View className="flex-row items-center rounded-xl border border-line bg-surface px-4 py-3">
          <FileText size={20} color={colors.brandBlue} />
          <View className="ml-3 flex-1">
            <Text className="text-sm font-medium text-ink" numberOfLines={1}>
              {value.name}
            </Text>
            <Text className="text-xs text-ink-muted">{formatBytes(value.size)}</Text>
          </View>
          <Pressable
            onPress={() => onChange(null)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${value.name}`}
          >
            <X size={18} color={colors.inkMuted} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={choose}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`Upload ${label}`}
          className={`items-center rounded-xl border border-dashed px-4 py-5 active:bg-surface ${message ? 'border-danger' : 'border-ink-faint'}`}
        >
          {busy ? <ActivityIndicator color={colors.navy} /> : <Upload size={22} color={colors.brandBlue} />}
          <Text className="mt-1.5 text-sm font-semibold text-brand-blue">Choose file</Text>
          <Text className="text-xs text-ink-muted">{hint}</Text>
        </Pressable>
      )}
      {message ? <Text className="mt-1 text-xs text-danger">{message}</Text> : null}
    </View>
  );
}
