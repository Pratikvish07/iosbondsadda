import { Pressable, ScrollView, Text, View } from 'react-native';

interface Option<T extends string> {
  value: T;
  label: string;
}

/** Underlined segment control, as on bond detail and portfolio screens. */
export function UnderlineTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View className="flex-row border-b border-line" accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`flex-1 items-center py-3 ${active ? 'border-b-2 border-navy' : ''}`}
          >
            <Text className={`text-sm ${active ? 'font-bold text-navy' : 'text-ink-muted'}`}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Horizontally scrolling filter chips. */
export function PillTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-5"
      accessibilityRole="tablist"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`rounded-lg border px-4 py-2 ${active ? 'border-navy bg-navy' : 'border-line bg-white'}`}
          >
            <Text className={`text-sm ${active ? 'font-semibold text-white' : 'text-ink'}`}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
