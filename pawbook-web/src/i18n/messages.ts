import { DEFAULT_LOCALE, LOCALES, type Locale } from "./config";
import es from "./messages/es.json";

/** Catálogo de textos de la interfaz (OR-I18N-001). El español es la referencia de claves. */
export type Messages = typeof es;

const CATALOGS: Record<Locale, Messages> = { es };

/** Idioma de una etiqueta regional: "es-CO" → "es"; si no tiene catálogo, el idioma base. */
export function languageOf(locale: string): Locale {
  const language = locale.split("-")[0].toLowerCase();
  return (LOCALES as readonly string[]).includes(language) ? (language as Locale) : DEFAULT_LOCALE;
}

/** Catálogo para una configuración regional: todas las variantes de un idioma lo comparten. */
export function messagesFor(locale: string): Messages {
  return CATALOGS[languageOf(locale)];
}
