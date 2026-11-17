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

  test("las etiquetas con número concuerdan en singular y plural", () => {
    const t = createTranslator({ locale: "es", messages: es, namespace: "profile" });
    expect(t("followersStat", { count: 1 })).toBe("Seguidor");
    expect(t("followersStat", { count: 0 })).toBe("Seguidores");
    expect(t("followersStat", { count: 1204 })).toBe("Seguidores");
    expect(t("postsStat", { count: 1 })).toBe("Publicación");
    expect(t("postsStat", { count: 3 })).toBe("Publicaciones");
  });

  test("los mensajes de validación usan el límite como variable", () => {
    const t = createTranslator({ locale: "es", messages: es, namespace: "registration" });
    expect(t("errors.passwordTooShort", { min: 8 })).toBe(
      "La contraseña necesita al menos 8 caracteres.",
    );
    expect(t("passwordPlaceholder", { min: 8 })).toBe("Mínimo 8 caracteres");
  });

  test("los textos con enlaces conservan las etiquetas como marcado", () => {
    const t = createTranslator({ locale: "es", messages: es, namespace: "registration" });
    const html = t.markup("terms", {
      terms: (chunks) => `<a>${chunks}</a>`,
      privacy: (chunks) => `<a>${chunks}</a>`,
    });
    expect(html).toBe(
      "Confirmo que tengo [EDAD MÍNIMA] años o más y acepto los <a>Términos</a> y la <a>Política de privacidad</a>.",
    );
  });

  test("el progreso del alta interpola paso y total", () => {
    const t = createTranslator({ locale: "es", messages: es, namespace: "onboarding" });
    expect(t("progressLabel", { step: 2, total: 3 })).toBe("Paso 2 de 3");
    expect(t("progress", { step: 2, total: 3 })).toBe("2 de 3");
  });
});
