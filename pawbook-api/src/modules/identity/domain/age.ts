/*
 * Edad mínima de registro (FR-AUTH-001). El valor legal lo fijan los socios (T-F0.02, PRD Q2);
 * aquí solo está la regla, el número llega por configuración (`MIN_SIGNUP_AGE`).
 */

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

type CalendarDate = { year: number; month: number; day: number };

function parseCalendarDate(value: string): CalendarDate | null {
  const match = DATE_PATTERN.exec(value);
  if (match === null) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  // Rechaza fechas imposibles (2026-02-30) comprobando que no se desbordan al construirlas.
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1) return null;
  if (date.getUTCDate() !== day) return null;
  return { year, month, day };
}

/**
 * Años cumplidos en `today` (UTC). Quien nació un 29 de febrero cumple el 1 de marzo en los
 * años no bisiestos. Devuelve `null` si la fecha no es válida.
 */
export function ageOn(birthDate: string, today: Date): number | null {
  const birth = parseCalendarDate(birthDate);
  if (birth === null) return null;
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;
  const day = today.getUTCDate();
  let age = year - birth.year;
  if (month < birth.month || (month === birth.month && day < birth.day)) age -= 1;
  return age;
}

export type BirthDateCheck = "ok" | "invalid" | "underage";

export function checkBirthDate(birthDate: string, minAge: number, today: Date): BirthDateCheck {
  const age = ageOn(birthDate, today);
  // Una fecha futura da edad negativa: es inválida, no "menor de edad".
  if (age === null || age < 0 || age > 130) return "invalid";
  return age >= minAge ? "ok" : "underage";
}
