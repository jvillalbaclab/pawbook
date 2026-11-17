import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/*
 * Comprueba los tokens de color de globals.css (UI-006): ambos temas definen lo mismo,
 * la copia para "sin JS" coincide con la de data-theme y los pares texto/fondo que usa
 * la interfaz cumplen el contraste WCAG 2.2 AA (4,5:1 para texto normal).
 */

const css = readFileSync(join(import.meta.dir, "../app/globals.css"), "utf8");

function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No se encuentra el bloque ${selector}`);
  return css.slice(start, css.indexOf("}", start));
}

function tokens(source: string): Record<string, string> {
  return Object.fromEntries(
    [...source.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2]]),
  );
}

const light = tokens(block(":root"));
const darkOverrides = tokens(block(':root[data-theme="dark"]'));
const lightAll: Record<string, string> = { ...light, white: "#ffffff" };
const dark: Record<string, string> = { ...lightAll, ...darkOverrides };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** [texto, fondo] tal y como se combinan en los componentes. */
const TEXT_PAIRS: [string, string][] = [
  ["ink", "canvas"],
  ["ink", "surface"],
  ["ink-2", "surface"],
  ["ink-2", "surface-2"],
  ["muted", "canvas"],
  ["muted", "surface"],
  ["muted", "surface-2"],
  ["primary-ink", "surface"],
  ["primary-ink", "primary-tint"],
  ["white", "primary"],
  ["on-inverse", "inverse"],
  ["success-ink", "success-tint"],
  ["white", "success"],
  ["ai-ink", "ai-tint"],
  ["warn-ink", "warn-tint"],
  ["danger-ink", "danger-tint"],
];

describe("tokens de color", () => {
  test("la copia para la preferencia del sistema sin JS es idéntica a la de data-theme", () => {
    expect(tokens(block(":root:not([data-theme])"))).toEqual(darkOverrides);
  });

  for (const [name, palette] of [
    ["claro", lightAll],
    ["oscuro", dark],
  ] as const) {
    test.each(TEXT_PAIRS)(`tema ${name}: %s sobre %s cumple AA`, (fg, bg) => {
      expect(palette[fg]).toBeDefined();
      expect(palette[bg]).toBeDefined();
      expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
    });
  }
});
