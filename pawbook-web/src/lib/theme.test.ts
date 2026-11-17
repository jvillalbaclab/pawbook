import { describe, expect, test } from "bun:test";
import {
  nextThemePreference,
  parseThemePreference,
  readThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemeStorage,
  themeInitScript,
  writeThemePreference,
} from "./theme";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: NonNullable<ThemeStorage> = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
  return { storage, data };
}

const brokenStorage: NonNullable<ThemeStorage> = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
  removeItem: () => {
    throw new Error("SecurityError");
  },
};

describe("preferencia de tema", () => {
  test("por defecto sigue al sistema; lo desconocido también", () => {
    expect(parseThemePreference(null)).toBe("system");
    expect(parseThemePreference(undefined)).toBe("system");
    expect(parseThemePreference("sepia")).toBe("system");
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
  });

  test("resuelve el tema con la preferencia del sistema solo en automático", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  test("el conmutador recorre automático → claro → oscuro → automático", () => {
    expect(nextThemePreference("system")).toBe("light");
    expect(nextThemePreference("light")).toBe("dark");
    expect(nextThemePreference("dark")).toBe("system");
  });
});

describe("persistencia", () => {
  test("guarda la elección manual y la vuelve a leer", () => {
    const { storage, data } = memoryStorage();
    expect(writeThemePreference(storage, "dark")).toBe(true);
    expect(data.get(THEME_STORAGE_KEY)).toBe("dark");
    expect(readThemePreference(storage)).toBe("dark");
  });

  test("volver a automático borra la clave", () => {
    const { storage, data } = memoryStorage({ [THEME_STORAGE_KEY]: "light" });
    writeThemePreference(storage, "system");
    expect(data.has(THEME_STORAGE_KEY)).toBe(false);
    expect(readThemePreference(storage)).toBe("system");
  });

  test("sin almacenamiento disponible no falla y sigue al sistema", () => {
    expect(readThemePreference(null)).toBe("system");
    expect(readThemePreference(brokenStorage)).toBe("system");
    expect(writeThemePreference(null, "dark")).toBe(false);
    expect(writeThemePreference(brokenStorage, "dark")).toBe(false);
  });
});

describe("script previo al primer pintado", () => {
  /** Ejecuta el script con un localStorage y un matchMedia simulados. */
  function runInitScript(stored: string | null, systemDark: boolean, storageThrows = false) {
    const documentElement = { dataset: {} as Record<string, string> };
    const localStorage = {
      getItem: (key: string) => {
        if (storageThrows) throw new Error("SecurityError");
        return key === THEME_STORAGE_KEY ? stored : null;
      },
    };
    const window = { matchMedia: () => ({ matches: systemDark }) };
    new Function("document", "localStorage", "window", themeInitScript)(
      { documentElement },
      localStorage,
      window,
    );
    return documentElement.dataset.theme;
  }

  test("aplica la preferencia guardada aunque el sistema diga lo contrario", () => {
    expect(runInitScript("dark", false)).toBe("dark");
    expect(runInitScript("light", true)).toBe("light");
  });

  test("sin preferencia guardada usa la del sistema", () => {
    expect(runInitScript(null, true)).toBe("dark");
    expect(runInitScript(null, false)).toBe("light");
    expect(runInitScript("sepia", true)).toBe("dark");
  });

  test("si el almacenamiento falla no fija tema y deja actuar a la media query CSS", () => {
    expect(runInitScript(null, true, true)).toBeUndefined();
  });
});
