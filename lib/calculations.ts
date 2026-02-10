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
