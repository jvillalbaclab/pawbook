import { describe, expect, test } from "bun:test";
import {
  formatClockTime,
  formatCompactNumber,
  formatConversationTime,
  formatDistanceKm,
  formatFullDateTime,
  formatNumber,
  formatRelativeTime,
  formatShortDate,
} from "./format";

// Intl separa algunas piezas con espacios finos o duros; se normalizan para comparar.
const plain = (text: string) => text.replace(/[  ]/g, " ");

const NOW = new Date("2026-03-12T12:00:00Z");
const TZ = "Europe/Madrid";
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("números", () => {
  test("usa los separadores de cada región", () => {
    expect(formatNumber(1204, "es-ES")).toBe("1204");
    expect(formatNumber(1204, "es-CO")).toBe("1.204");
    expect(formatNumber(12045.5, "es")).toBe("12.045,5");
  });

  test("contadores compactos", () => {
    expect(plain(formatCompactNumber(1204, "es-ES"))).toBe("1,2 mil");
    expect(plain(formatCompactNumber(1_250_000, "es"))).toBe("1,3 M");
    expect(formatCompactNumber(87, "es")).toBe("87");
  });

  test("distancias aproximadas sin precisión exacta", () => {
    expect(plain(formatDistanceKm(1.2, "es"))).toBe("≈ 1 km");
    expect(plain(formatDistanceKm(2.6, "es"))).toBe("≈ 3 km");
    expect(plain(formatDistanceKm(0.3, "es"))).toBe("< 1 km");
  });
});

describe("tiempos relativos", () => {
  test.each([
    [10_000, "ahora"],
    [5 * MIN, "hace 5 min"],
    [59 * MIN, "hace 59 min"],
    [2 * HOUR, "hace 2 h"],
    [23 * HOUR, "hace 23 h"],
    [30 * HOUR, "ayer"],
    [3 * DAY, "hace 3 días"],
  ])("hace %i ms → %s", (elapsed, expected) => {
    expect(plain(formatRelativeTime(ago(elapsed), NOW, "es", TZ))).toBe(expected);
  });

  test("a partir de una semana muestra la fecha corta", () => {
    expect(plain(formatRelativeTime(ago(10 * DAY), NOW, "es-ES", TZ))).toBe("2 mar");
  });

  test("de otro año añade el año", () => {
    expect(plain(formatRelativeTime("2025-12-01T10:00:00Z", NOW, "es-ES", TZ))).toBe("1 dic 2025");
  });

  test("una fecha futura (reloj desajustado) se muestra como ahora", () => {
    expect(formatRelativeTime(new Date(NOW.getTime() + 5 * MIN), NOW, "es", TZ)).toBe("ahora");
  });

  test("acepta fechas ISO como las que devolverá la API", () => {
    expect(plain(formatRelativeTime(ago(2 * HOUR).toISOString(), NOW, "es", TZ))).toBe("hace 2 h");
  });
});

describe("fechas y horas", () => {
  test("la hora respeta la zona horaria y el formato de la región", () => {
    expect(formatClockTime(NOW, "es-ES", TZ)).toBe("13:00");
    expect(plain(formatClockTime(NOW, "es-CO", "America/Bogota"))).toBe("7:00 a. m.");
  });

  test("fecha corta según la región", () => {
    expect(plain(formatShortDate(ago(10 * DAY), NOW, "es-ES", TZ))).toBe("2 mar");
    expect(plain(formatShortDate(ago(10 * DAY), NOW, "es-CO", TZ))).toBe("2 de mar");
  });

  test("fecha y hora completas para el título", () => {
    expect(plain(formatFullDateTime(NOW, "es-ES", TZ))).toBe("12 de marzo de 2026 a las 13:00");
  });

  test("lista de conversaciones: hoy hora, ayer, día de la semana y fecha", () => {
    expect(formatConversationTime(ago(HOUR), NOW, "es-ES", TZ)).toBe("12:00");
    expect(formatConversationTime(ago(20 * HOUR), NOW, "es-ES", TZ)).toBe("ayer");
    expect(formatConversationTime(ago(3 * DAY), NOW, "es-ES", TZ)).toBe("lun");
    expect(plain(formatConversationTime(ago(30 * DAY), NOW, "es-ES", TZ))).toBe("10 feb");
  });
});
