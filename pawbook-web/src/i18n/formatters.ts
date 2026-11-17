import {
  formatClockTime,
  formatCompactNumber,
  formatConversationTime,
  formatDistanceKm,
  formatFullDateTime,
  formatNumber,
  formatRelativeTime,
} from "@/lib/format";
import { FORMAT_LOCALE } from "./config";

/*
 * Formateadores ligados a la configuración regional de la web. La zona horaria es la
 * del entorno: en el navegador, la del usuario. Cuando la cuenta guarde su región y su
 * zona horaria, se leerán de ahí en lugar de FORMAT_LOCALE.
 */

type DateInput = Date | string;

export const fmt = {
  number: (value: number) => formatNumber(value, FORMAT_LOCALE),
  compact: (value: number) => formatCompactNumber(value, FORMAT_LOCALE),
  distanceKm: (km: number) => formatDistanceKm(km, FORMAT_LOCALE),
  clock: (date: DateInput) => formatClockTime(date, FORMAT_LOCALE),
  fullDateTime: (date: DateInput) => formatFullDateTime(date, FORMAT_LOCALE),
  relative: (date: DateInput, now: DateInput = new Date()) =>
    formatRelativeTime(date, now, FORMAT_LOCALE),
  conversationTime: (date: DateInput, now: DateInput = new Date()) =>
    formatConversationTime(date, now, FORMAT_LOCALE),
};
