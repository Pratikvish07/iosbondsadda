import { parseApiDate, toApiDate, toNumber } from './format';
import type { CashFlowScheduleRow, Product } from '@/store/api/types';

/**
 * Indicative deal and cash-flow calculations shown before the investor commits.
 *
 * Conventions (confirm with BondsAdda operations before changing):
 * - `Price` is quoted per 100 of face value (clean price), e.g. "103.30".
 * - Accrued interest = principal × coupon × days since last interest-payment date / 365 (Actual/365).
 * - Settlement is T+1 business day (weekends skipped; exchange holidays are not known client-side).
 * - Stamp duty on transfer of debt securities = 0.0001% of consideration, rounded up to the rupee.
 *
 * The server remains the source of truth: deal confirmations carry the authoritative figures.
 */

export const STAMP_DUTY_RATE = 0.000001;
const DAY_MS = 24 * 60 * 60 * 1000;

export type PaymentFrequency = { label: string; periodsPerYear: number; months: number };

const FREQUENCIES: Record<string, PaymentFrequency> = {
  monthly: { label: 'Monthly', periodsPerYear: 12, months: 1 },
  quarterly: { label: 'Quarterly', periodsPerYear: 4, months: 3 },
  'half yearly': { label: 'Half-Yearly', periodsPerYear: 2, months: 6 },
  halfyearly: { label: 'Half-Yearly', periodsPerYear: 2, months: 6 },
  'semi annual': { label: 'Semi-Annual', periodsPerYear: 2, months: 6 },
  semiannual: { label: 'Semi-Annual', periodsPerYear: 2, months: 6 },
  annual: { label: 'Annual', periodsPerYear: 1, months: 12 },
  annually: { label: 'Annual', periodsPerYear: 1, months: 12 },
  yearly: { label: 'Annual', periodsPerYear: 1, months: 12 },
};

/** Returns null for cumulative / at-maturity bonds, which have no periodic coupon. */
export function paymentFrequency(paymentType: string | null | undefined): PaymentFrequency | null {
  const key = (paymentType ?? '').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  return FREQUENCIES[key] ?? FREQUENCIES[key.replace(/\s/g, '')] ?? null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

export function addBusinessDays(date: Date, days: number): Date {
  const result = startOfDay(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

/** Adds months, clamping to month end (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(date: Date, months: number, endOfMonth = false): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(endOfMonth ? lastDay : Math.min(date.getDate(), lastDay));
  return target;
}

export interface BondTerms {
  faceValue: number;
  couponRate: number;
  price: number;
  ytm: number | null;
  maturity: Date | null;
  nextInterestDate: Date | null;
  frequency: PaymentFrequency | null;
  availableUnits: number | null;
}

export function bondTerms(product: Product): BondTerms {
  return {
    faceValue: toNumber(product.FaceValue) ?? 0,
    couponRate: toNumber(product.CouponRate) ?? 0,
    price: toNumber(product.Price) ?? 100,
    ytm: toNumber(product.YTM),
    maturity: parseApiDate(product.MaturityDate),
    nextInterestDate: parseApiDate(product.IPDate),
    frequency: paymentFrequency(product.PaymentType),
    availableUnits: toNumber(product.Quantity),
  };
}

export interface DealQuote {
  quantity: number;
  dealDate: Date;
  settlementDate: Date;
  lastInterestDate: Date | null;
  accruedDays: number;
  principal: number;
  /** Clean consideration: principal × price / 100. */
  dealValue: number;
  accruedInterest: number;
  /** dealValue + accruedInterest. */
  grossConsideration: number;
  stampDuty: number;
  /** Amount the investor pays: grossConsideration + stampDuty. */
  totalPayable: number;
  annualInterest: number;
  /** Coupons from settlement to maturity, excluding principal. */
  totalInterestToMaturity: number;
  maturityValue: number;
  /** Projected payouts from settlement to maturity for this quantity. */
  schedule: CashFlowRow[];
}

export function quoteDeal(
  terms: BondTerms,
  quantity: number,
  lastInterestDate: Date | null,
  now = new Date(),
): DealQuote {
  const dealDate = startOfDay(now);
  const settlementDate = addBusinessDays(dealDate, 1);
  const principal = round2(terms.faceValue * quantity);
  const dealValue = round2((principal * terms.price) / 100);
  const accruedDays =
    lastInterestDate && lastInterestDate <= settlementDate ? daysBetween(lastInterestDate, settlementDate) : 0;
  const accruedInterest = round2((principal * terms.couponRate * accruedDays) / 100 / 365);
  const grossConsideration = round2(dealValue + accruedInterest);
  const stampDuty = grossConsideration > 0 ? Math.ceil(grossConsideration * STAMP_DUTY_RATE) : 0;
  const annualInterest = round2((principal * terms.couponRate) / 100);
  const schedule = cashFlowSchedule(terms, principal, settlementDate);
  const totalInterestToMaturity = round2(schedule.reduce((sum, row) => sum + row.interest, 0));

  return {
    quantity,
    dealDate,
    settlementDate,
    lastInterestDate,
    accruedDays,
    principal,
    dealValue,
    accruedInterest,
    grossConsideration,
    stampDuty,
    totalPayable: round2(grossConsideration + stampDuty),
    annualInterest,
    totalInterestToMaturity,
    maturityValue: round2(principal + totalInterestToMaturity),
    schedule,
  };
}

export interface CashFlowRow {
  date: Date;
  interest: number;
  principal: number;
  total: number;
}

/**
 * Projects coupon dates from the next interest-payment date until maturity. The final row also
 * repays principal. Cumulative bonds (no recognised frequency) return a single maturity row.
 */
export function cashFlowSchedule(terms: BondTerms, principal: number, settlementDate: Date): CashFlowRow[] {
  const { maturity, frequency, couponRate } = terms;
  if (!maturity || maturity <= settlementDate || principal <= 0) return [];

  if (!frequency) {
    const years = daysBetween(settlementDate, maturity) / 365;
    const interest = round2(principal * (Math.pow(1 + couponRate / 100, years) - 1));
    return [{ date: maturity, interest, principal, total: round2(principal + interest) }];
  }

  const perPeriod = round2((principal * couponRate) / 100 / frequency.periodsPerYear);
  const anchor = terms.nextInterestDate ?? addMonths(settlementDate, frequency.months);
  const isMonthEnd = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + 1).getDate() === 1;

  // Walk the anchor forward/back so the first coupon is the first one after settlement.
  let date = anchor;
  while (date > settlementDate) {
    const previous = addMonths(date, -frequency.months, isMonthEnd);
    if (previous <= settlementDate) break;
    date = previous;
  }
  while (date <= settlementDate) date = addMonths(date, frequency.months, isMonthEnd);

  const rows: CashFlowRow[] = [];
  let periodStart = settlementDate;
  // Hard cap guards against malformed dates producing an unbounded loop (50 years of monthly coupons).
  for (let i = 0; date < maturity && i < 600; i++) {
    rows.push({ date, interest: perPeriod, principal: 0, total: perPeriod });
    periodStart = date;
    date = addMonths(date, frequency.months, isMonthEnd);
  }
  // Broken final period is accrued on Actual/365.
  const finalInterest = round2((principal * couponRate * daysBetween(periodStart, maturity)) / 100 / 365);
  rows.push({ date: maturity, interest: finalInterest, principal, total: round2(principal + finalInterest) });
  return rows;
}

export function toScheduleRows(rows: CashFlowRow[]): CashFlowScheduleRow[] {
  return rows.map((row) => ({
    monthDayValue: String(row.date.getDate()),
    interestDate: toApiDate(row.date),
    interestValue: row.interest.toFixed(2),
  }));
}

/** Cost of one unit including price premium/discount — the API exposes no separate minimum ticket. */
export function minimumInvestment(terms: BondTerms): number {
  return round2((terms.faceValue * terms.price) / 100);
}
