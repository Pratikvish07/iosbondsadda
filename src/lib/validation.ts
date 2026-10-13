import { parseApiDate } from './format';

export type Validator = (value: string) => string | null;

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const isIndianMobile = (v: string) => /^[6-9]\d{9}$/.test(v.trim());
export const isPan = (v: string) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.trim().toUpperCase());
export const isAadhaar = (v: string) => /^[2-9]\d{11}$/.test(v.replace(/\s/g, ''));
export const isIfsc = (v: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.trim().toUpperCase());
export const isBankAccount = (v: string) => /^\d{9,18}$/.test(v.trim());
/** NSDL (IN + 14 chars) or CDSL (16 digits) beneficiary owner ID. */
export const isDematAccount = (v: string) =>
  /^(IN[0-9A-Z]{14}|\d{16})$/.test(v.replace(/\s/g, '').toUpperCase());

export const MIN_PASSWORD_LENGTH = 6;
export const MIN_INVESTOR_AGE = 18;

export const required =
  (label: string): Validator =>
  (v) =>
    v.trim() ? null : `${label} is required`;

/** Passes on empty input so it can be combined with `required` for optional fields. */
export const rule =
  (test: (v: string) => boolean, message: string): Validator =>
  (v) =>
    !v.trim() || test(v) ? null : message;

export function ageOn(dob: Date, today = new Date()): number {
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export const validateDob: Validator = (v) => {
  if (!v.trim()) return 'Date of birth is required';
  const dob = parseApiDate(v);
  if (!dob || !/^\d{2}\/\d{2}\/\d{4}$/.test(v.trim())) return 'Use DD/MM/YYYY format';
  if (dob > new Date()) return 'Date of birth cannot be in the future';
  const age = ageOn(dob);
  if (age < MIN_INVESTOR_AGE) return `You must be at least ${MIN_INVESTOR_AGE} years old`;
  if (age > 120) return 'Enter a valid date of birth';
  return null;
};

/** Inserts slashes as the user types a date: "01011995" -> "01/01/1995". */
export function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Runs each field's validators in order; returns the first failure per field. */
export function validate<T extends Record<string, string>>(
  values: T,
  rules: Partial<Record<keyof T, Validator[]>>,
): Partial<Record<keyof T, string>> {
  const errors: Partial<Record<keyof T, string>> = {};
  for (const key of Object.keys(rules) as (keyof T)[]) {
    for (const check of rules[key] ?? []) {
      const message = check(values[key] ?? '');
      if (message) {
        errors[key] = message;
        break;
      }
    }
  }
  return errors;
}

export const hasErrors = (errors: object) => Object.keys(errors).length > 0;
