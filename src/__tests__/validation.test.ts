import { formatCurrency, maskTail, parseApiDate, resolveAssetUrl, toApiDate } from '@/lib/format';
import { issuerName, ratingTone } from '@/lib/bonds';
import {
  isAadhaar,
  isDematAccount,
  isEmail,
  isIfsc,
  isIndianMobile,
  isPan,
  maskDateInput,
  validate,
  validateDob,
  required,
  rule,
} from '@/lib/validation';

describe('identity validators', () => {
  it('validates PAN', () => {
    expect(isPan('ABCDE1234F')).toBe(true);
    expect(isPan('abcde1234f')).toBe(true);
    expect(isPan('ABCD1234F')).toBe(false);
  });

  it('validates Aadhaar (12 digits, cannot start with 0 or 1)', () => {
    expect(isAadhaar('234123412346')).toBe(true);
    expect(isAadhaar('2341 2341 2346')).toBe(true);
    expect(isAadhaar('123412341234')).toBe(false);
    expect(isAadhaar('23412341234')).toBe(false);
  });

  it('validates IFSC', () => {
    expect(isIfsc('HDFC0001234')).toBe(true);
    expect(isIfsc('HDFC1001234')).toBe(false);
  });

  it('validates demat BO IDs for NSDL and CDSL', () => {
    expect(isDematAccount('1201234567890123')).toBe(true);
    expect(isDematAccount('IN30012345678901')).toBe(true);
    expect(isDematAccount('12345')).toBe(false);
  });

  it('validates contact details', () => {
    expect(isEmail('test@example.com')).toBe(true);
    expect(isEmail('test@')).toBe(false);
    expect(isIndianMobile('9999999999')).toBe(true);
    expect(isIndianMobile('5999999999')).toBe(false);
  });
});

describe('date of birth', () => {
  it('masks input as DD/MM/YYYY', () => {
    expect(maskDateInput('01011995')).toBe('01/01/1995');
    expect(maskDateInput('0101')).toBe('01/01');
  });

  it('requires a real date and an adult investor', () => {
    expect(validateDob('01/01/1995')).toBeNull();
    expect(validateDob('31/02/1995')).toBe('Use DD/MM/YYYY format');
    expect(validateDob('01/01/2020')).toMatch(/at least 18/);
    expect(validateDob('')).toMatch(/required/);
  });
});

describe('validate()', () => {
  it('returns the first failing rule per field', () => {
    const errors = validate(
      { email: '', pan: 'bad' },
      { email: [required('Email'), rule(isEmail, 'Invalid email')], pan: [rule(isPan, 'Invalid PAN')] },
    );
    expect(errors).toEqual({ email: 'Email is required', pan: 'Invalid PAN' });
  });
});

describe('formatting', () => {
  it('round-trips API dates and rejects impossible ones', () => {
    expect(toApiDate(parseApiDate('24/09/2032')!)).toBe('24/09/2032');
    expect(parseApiDate('31/02/2026')).toBeNull();
    expect(parseApiDate('2026-02-01')).toBeNull();
  });

  it('formats rupees in Indian grouping', () => {
    expect(formatCurrency(133400)).toBe('₹1,33,400');
    expect(formatCurrency('101200.5', true)).toBe('₹1,01,200.50');
    expect(formatCurrency(null)).toBe('—');
  });

  it('masks identifiers', () => {
    expect(maskTail('123412341234')).toBe('••••••••1234');
  });

  it('resolves relative asset paths against the API origin over https', () => {
    expect(resolveAssetUrl('/VImage/logo.jpg')).toBe('https://bondsadda.com/VImage/logo.jpg');
    expect(resolveAssetUrl('http://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
    expect(resolveAssetUrl(null)).toBeNull();
  });

  it('derives display names and rating tones', () => {
    expect(issuerName({ ProductName: '8.88% MUTHOOT FINCORP LIMITED 2032', Security: '' })).toBe(
      'Muthoot Fincorp Limited',
    );
    expect(ratingTone('AA')).toBe('success');
    expect(ratingTone('BBB+')).toBe('warning');
  });
});
