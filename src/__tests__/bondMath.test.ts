import {
  addBusinessDays,
  addMonths,
  bondTerms,
  cashFlowSchedule,
  minimumInvestment,
  paymentFrequency,
  quoteDeal,
  toScheduleRows,
} from '@/lib/bondMath';
import { parseApiDate } from '@/lib/format';
import type { Product } from '@/store/api/types';

// Captured from the live products endpoint.
const MUTHOOT: Product = {
  ProductId: '5075',
  ProductName: '8.88% MUTHOOT FINCORP LIMITED 2032',
  Security: '8.88% MUTHOOT FINCORP LIMITED 2032',
  ISINNumber: 'INE549K07JE7 ',
  CategoryId: '16',
  CategoryName: 'High Return Bonds',
  PaymentType: 'Monthly',
  FaceValue: '1000',
  CouponRate: '8.88',
  YTM: '8.5',
  Price: '103.30',
  MaturityDate: '24/09/2032',
  IPDate: '01/10/2026',
  Quantity: '10000',
  StockStatus: null,
  CreditRating: 'AA',
  ImageUrl: '/VImage/66121mfl-logo.jpg',
  DetailsUrl: '/bond/muthoot-fincorp-2032',
};

const d = (s: string) => parseApiDate(s)!;

describe('paymentFrequency', () => {
  it.each([
    ['Monthly', 12],
    ['Quarterly', 4],
    ['Half-Yearly', 2],
    ['Semi Annual', 2],
    ['Annual', 1],
  ])('%s -> %i periods', (label, periods) => {
    expect(paymentFrequency(label)?.periodsPerYear).toBe(periods);
  });

  it('treats unknown / cumulative types as no periodic coupon', () => {
    expect(paymentFrequency('Cumulative')).toBeNull();
    expect(paymentFrequency(null)).toBeNull();
  });
});

describe('date helpers', () => {
  it('settles T+1 and skips weekends', () => {
    expect(addBusinessDays(d('13/10/2026'), 1)).toEqual(d('14/10/2026')); // Tue -> Wed
    expect(addBusinessDays(d('16/10/2026'), 1)).toEqual(d('19/10/2026')); // Fri -> Mon
  });

  it('clamps to month end', () => {
    expect(addMonths(d('31/01/2026'), 1)).toEqual(d('28/02/2026'));
    expect(addMonths(d('28/02/2026'), 1, true)).toEqual(d('31/03/2026'));
  });
});

describe('quoteDeal', () => {
  const terms = bondTerms(MUTHOOT);
  const quote = quoteDeal(terms, 10, d('01/10/2026'), new Date(2026, 9, 13, 15, 30));

  it('prices principal, accrued interest and stamp duty', () => {
    expect(quote.settlementDate).toEqual(d('14/10/2026'));
    expect(quote.principal).toBe(10000);
    expect(quote.dealValue).toBe(10330);
    expect(quote.accruedDays).toBe(13);
    // 10000 × 8.88% × 13 / 365
    expect(quote.accruedInterest).toBe(31.63);
    expect(quote.grossConsideration).toBe(10361.63);
    expect(quote.stampDuty).toBe(1);
    expect(quote.totalPayable).toBe(10362.63);
    expect(quote.annualInterest).toBe(888);
  });

  it('never accrues negative interest when the last IP date is after settlement', () => {
    const q = quoteDeal(terms, 1, d('01/12/2026'), new Date(2026, 9, 13));
    expect(q.accruedDays).toBe(0);
    expect(q.accruedInterest).toBe(0);
  });

  it('reports the cost of one unit as the minimum investment', () => {
    expect(minimumInvestment(terms)).toBe(1033);
  });
});

describe('cashFlowSchedule', () => {
  const terms = bondTerms(MUTHOOT);
  const rows = cashFlowSchedule(terms, 10000, d('14/10/2026'));

  it('starts at the first coupon after settlement and ends at maturity with principal', () => {
    expect(rows[0].date).toEqual(d('01/11/2026'));
    expect(rows[0].interest).toBe(74); // 10000 × 8.88% / 12
    const last = rows[rows.length - 1];
    expect(last.date).toEqual(d('24/09/2032'));
    expect(last.principal).toBe(10000);
    // Broken final period 01/09/2032 -> 24/09/2032 = 23 days.
    expect(last.interest).toBe(55.96);
  });

  it('produces one row per month until maturity', () => {
    // Nov 2026..Sep 2032 = 71 monthly coupons + the maturity payment.
    expect(rows).toHaveLength(72);
    expect(rows.slice(0, -1).every((r) => r.date.getDate() === 1)).toBe(true);
  });

  it('serialises rows in the saveCashFlow format', () => {
    expect(toScheduleRows(rows.slice(0, 1))).toEqual([
      { monthDayValue: '1', interestDate: '01/11/2026', interestValue: '74.00' },
    ]);
  });

  it('returns a single compounded payout for cumulative bonds', () => {
    const cumulative = bondTerms({ ...MUTHOOT, PaymentType: 'Cumulative' });
    const single = cashFlowSchedule(cumulative, 10000, d('14/10/2026'));
    expect(single).toHaveLength(1);
    expect(single[0].principal).toBe(10000);
    expect(single[0].interest).toBeGreaterThan(0);
  });

  it('returns nothing for matured bonds', () => {
    expect(cashFlowSchedule(terms, 10000, d('01/01/2033'))).toEqual([]);
  });
});
