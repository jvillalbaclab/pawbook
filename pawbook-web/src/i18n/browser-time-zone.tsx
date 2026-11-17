"use client";

import { NextIntlClientProvider, useLocale, useMessages, useTimeZone } from "next-intl";
import { type ReactNode, useSyncExternalStore } from "react";

/*
 * Zona horaria de los textos con fecha de next-intl. Las páginas se prerenderizan en el
 * build, donde no hay usuario: allí se usa la zona fija de src/i18n/request.ts (UTC). En el
 * navegador se usa la del usuario. useSyncExternalStore da la del servidor durante la
 * hidratación (mismo HTML, sin desajustes) y la del navegador justo después.
 * Cuando el perfil guarde una zona horaria, tendrá prioridad sobre la del navegador.
 */

const subscribe = () => () => {};

/** Zona IANA del navegador (p. ej. "Europe/Madrid"); `null` si no se puede leer. */
export function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

export function BrowserTimeZoneProvider({ children }: { children: ReactNode }) {
  const serverTimeZone = useTimeZone();
  const locale = useLocale();
  const messages = useMessages();
  const timeZone = useSyncExternalStore(
    subscribe,
    () => browserTimeZone() ?? serverTimeZone,
    () => serverTimeZone,
  );
  // Siempre el mismo árbol: envolver solo a veces remontaría toda la app tras hidratar.
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      {children}
    </NextIntlClientProvider>
  );
}
