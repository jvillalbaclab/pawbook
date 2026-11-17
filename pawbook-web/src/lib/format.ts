/*
 * Formato regional de fechas, números y tiempos relativos (OR-I18N-002).
 * Funciones puras: reciben la configuración regional y, cuando importa, el "ahora",
 * para que los tests sean deterministas. Todo se apoya en Intl; nada de cadenas a mano.
 */

type DateInput = Date | string | number;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Número con separadores de la región: 1204 → "1204" (es-ES) o "1.204" (es-CO). */
export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** Número compacto para contadores: 1204 → "1,2 mil". */
export function formatCompactNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

/** Distancia aproximada en kilómetros: 1 → "≈ 1 km"; por debajo de 1 km se muestra "< 1 km". */
export function formatDistanceKm(km: number, locale: string): string {
  const unit = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "unit",
      unit: "kilometer",
      maximumFractionDigits: 0,
    }).format(value);
  return km < 1 ? `< ${unit(1)}` : `≈ ${unit(Math.round(km))}`;
}

/** Fecha corta: "12 mar" este año, "12 mar 2025" en otro año. */
export function formatShortDate(
  value: DateInput,
  now: DateInput,
  locale: string,
  timeZone?: string,
): string {
  const date = toDate(value);
  const sameYear =
    new Intl.DateTimeFormat("en", { year: "numeric", timeZone }).format(date) ===
    new Intl.DateTimeFormat("en", { year: "numeric", timeZone }).format(toDate(now));
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
    timeZone,
  }).format(date);
}

/** Hora del reloj: "10:41". */
export function formatClockTime(value: DateInput, locale: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone }).format(
    toDate(value),
  );
}

/** Fecha y hora completas, para el atributo title de <time>. */
export function formatFullDateTime(value: DateInput, locale: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
    timeZone,
  }).format(toDate(value));
}

/**
 * Tiempo relativo para publicaciones y comentarios: "ahora", "hace 5 min", "hace 2 h",
 * "ayer", "hace 3 días" y, a partir de una semana, la fecha corta. Fechas futuras
 * (relojes desajustados) se tratan como "ahora".
 */
export function formatRelativeTime(
  value: DateInput,
  now: DateInput,
  locale: string,
  timeZone?: string,
): string {
  const elapsed = toDate(now).getTime() - toDate(value).getTime();
  // Abreviado para minutos y horas ("hace 2 h"); los días se leen mejor completos.
  const short = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  const long = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (elapsed < MINUTE) return short.format(0, "second");
  if (elapsed < HOUR) return short.format(-Math.floor(elapsed / MINUTE), "minute");
  if (elapsed < DAY) return short.format(-Math.floor(elapsed / HOUR), "hour");
  if (elapsed < 7 * DAY) return long.format(-Math.floor(elapsed / DAY), "day");
  return formatShortDate(value, now, locale, timeZone);
}

/**
 * Hora de la lista de conversaciones: hoy → "10:41"; ayer → "ayer"; esta semana → día
 * abreviado ("lun"); antes → fecha corta. Compara días naturales, no horas transcurridas.
 */
export function formatConversationTime(
  value: DateInput,
  now: DateInput,
  locale: string,
  timeZone?: string,
): string {
  const date = toDate(value);
  const dayKey = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    }).format(d);
  const daysApart = Math.round((Date.parse(dayKey(toDate(now))) - Date.parse(dayKey(date))) / DAY);
  if (daysApart <= 0) return formatClockTime(date, locale, timeZone);
  if (daysApart === 1) {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-1, "day");
  }
  if (daysApart < 7) {
    return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone }).format(date);
  }
  return formatShortDate(date, now, locale, timeZone);
}
