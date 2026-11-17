import { getRequestConfig } from "next-intl/server";
import { FORMAT_LOCALE } from "./config";
import { messagesFor } from "./messages";

/*
 * Configuración de next-intl por petición. Un solo idioma y sin prefijo en la URL: el
 * locale es la variante regional configurada (p. ej. "es" o "es-CO"), así los textos y
 * los formatos ICU ({n, number}) usan la misma región que src/i18n/formatters.ts.
 * No se lee requestLocale: evita headers() y permite el prerenderizado estático.
 */
export default getRequestConfig(async () => ({
  locale: FORMAT_LOCALE,
  messages: messagesFor(FORMAT_LOCALE),
}));
