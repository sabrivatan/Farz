import { differenceInDays, addYears, startOfDay } from 'date-fns';

export type Gender = 'male' | 'female';

export const DEFAULT_BULUGH_AGE_MALE = 14;
export const DEFAULT_BULUGH_AGE_FEMALE = 12;

/**
 * Calculates the suggested start date of religious responsibility (Bulugh).
 */
export const calculateBulughDate = (birthDate: Date, gender: Gender): Date => {
  const age = gender === 'male' ? DEFAULT_BULUGH_AGE_MALE : DEFAULT_BULUGH_AGE_FEMALE;
  return startOfDay(addYears(birthDate, age));
};

/**
 * Calculates the total number of days between the responsibility start date
 * and the date the user started practicing regularly.
 */
export const calculateInitialDebtDays = (bulughDate: Date, regularStartDate: Date): number => {
  const days = differenceInDays(regularStartDate, bulughDate);
  return days > 0 ? days : 0;
};

/**
 * Calculates prayer debt days based on bulugh date and regular start date.
 * Formula: Difference in days + 1
 */
export const calculatePrayerDebt = (bulughDate: Date, regularStartDate: Date): number => {
  if (regularStartDate <= bulughDate) return 0;
  // +1 to include the start date
  const days = differenceInDays(regularStartDate, bulughDate) + 1;
  return days > 0 ? days : 0;
};

/**
 * Calculates fasting debt days based on bulugh date and regular start date.
 * Formula: (Years difference) * 30
 */
export const calculateFastingDebt = (bulughDate: Date, regularStartDate: Date): number => {
  if (regularStartDate <= bulughDate) return 0;
  
  const oneDay = 24 * 60 * 60 * 1000;
  const diffTime = Math.abs(regularStartDate.getTime() - bulughDate.getTime());
  const diffYears = diffTime / (oneDay * 365.25);
  
  return Math.floor(diffYears * 30);
};
