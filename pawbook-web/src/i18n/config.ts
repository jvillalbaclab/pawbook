/*
 * Configuración regional de la web (OR-I18N-001, OR-I18N-002).
 *
 * - LOCALES: idiomas con catálogo de textos. El MVP se publica solo en español.
 * - FORMAT_LOCALE: variante regional para fechas y números. El mercado inicial (España o
 *   Colombia) aún no está decidido, así que por defecto es "es" neutro y se fija por
 *   entorno con NEXT_PUBLIC_FORMAT_LOCALE (p. ej. "es-ES" o "es-CO"). No hay moneda fija.
 */

export const LOCALES = ["es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";

/** Normaliza una etiqueta BCP 47; si no es válida o no es una variante de un idioma soportado, cae al idioma base. */
export function resolveFormatLocale(value: string | undefined): string {
  if (!value) return DEFAULT_LOCALE;
  try {
    const [canonical] = Intl.getCanonicalLocales(value);
    const language = canonical.split("-")[0];
    return (LOCALES as readonly string[]).includes(language) ? canonical : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export const FORMAT_LOCALE = resolveFormatLocale(process.env.NEXT_PUBLIC_FORMAT_LOCALE);
