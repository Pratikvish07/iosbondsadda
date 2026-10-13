import {
  Banknote,
  Building2,
  CalendarClock,
  Factory,
  Landmark,
  LayoutGrid,
  PiggyBank,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react-native';

import { colors } from '@/theme/colors';

const RULES: [RegExp, LucideIcon, string][] = [
  [/all/i, LayoutGrid, colors.navy],
  [/bank|nbfc/i, Landmark, colors.success],
  [/capital gain|54ec/i, PiggyBank, colors.brandOrange],
  [/govt|government|sovereign|g-sec/i, ShieldCheck, colors.brandBlue],
  [/high return/i, TrendingUp, colors.brandOrange],
  [/monthly/i, CalendarClock, colors.brandBlue],
  [/non psu|corporate/i, Building2, colors.brandOrange],
  [/psu/i, Factory, colors.brandBlue],
  [/tax/i, Banknote, colors.success],
];

export function CategoryIcon({ name, size = 26 }: { name: string; size?: number }) {
  const match = RULES.find(([pattern]) => pattern.test(name));
  const Icon = match?.[1] ?? Building2;
  return <Icon size={size} color={match?.[2] ?? colors.brandBlue} />;
}
