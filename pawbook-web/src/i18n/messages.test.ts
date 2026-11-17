import { describe, expect, test } from "bun:test";
import { createTranslator } from "next-intl";
import { languageOf, messagesFor } from "./messages";
import es from "./messages/es.json";

describe("catálogo de textos", () => {
  test("todas las variantes del español comparten catálogo", () => {
    expect(languageOf("es")).toBe("es");
    expect(languageOf("es-CO")).toBe("es");
    expect(messagesFor("es-ES")).toBe(es);
  });

  test("un idioma sin catálogo cae al español", () => {
    expect(languageOf("fr-FR")).toBe("es");
    expect(messagesFor("fr")).toBe(es);
  });

  test("ningún texto del catálogo está vacío", () => {
    const empty: string[] = [];
    const walk = (node: unknown, path: string) => {
      if (typeof node === "string") {
        if (node.trim() === "") empty.push(path);
      } else if (node && typeof node === "object") {
        for (const [key, value] of Object.entries(node)) walk(value, path ? `${path}.${key}` : key);
      }
    };
    walk(es, "");
    expect(empty).toEqual([]);
  });

  test("interpola variables y formatea números con la región", () => {
    const t = createTranslator({ locale: "es-CO", messages: es, namespace: "composer" });
    expect(t("tooLong", { max: 2200 })).toBe("El texto supera los 2.200 caracteres.");
    expect(t("placeholder", { name: "Luna" })).toBe("¿Qué hizo Luna hoy?");
    const tEs = createTranslator({ locale: "es-ES", messages: es, namespace: "composer" });
    expect(tEs("tooLong", { max: 2200 })).toBe("El texto supera los 2200 caracteres.");
  });
});
