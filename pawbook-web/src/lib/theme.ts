/*
 * Tema claro/oscuro (UI-006). Lógica pura, sin React ni DOM, para poder probarla:
 * - La preferencia puede ser "system" (por defecto), "light" o "dark".
 * - El tema aplicado ("light" | "dark") se resuelve con la preferencia del sistema.
 * - Solo se guarda una elección manual; "system" borra la clave para seguir al sistema.
 */

export type Theme = "light" | "dark";
export type ThemePreference = "system" | Theme;

export const THEME_STORAGE_KEY = "pawbook-theme";
export const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

/** Orden del conmutador: automático → claro → oscuro → automático. */
export const THEME_PREFERENCES: readonly ThemePreference[] = ["system", "light", "dark"];

/** Normaliza cualquier valor leído del almacenamiento: lo desconocido sigue al sistema. */
export function parseThemePreference(value: string | null | undefined): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

/** Tema que se pinta para una preferencia dada. */
export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): Theme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

/** Siguiente preferencia al pulsar el conmutador. */
export function nextThemePreference(current: ThemePreference): ThemePreference {
  const index = THEME_PREFERENCES.indexOf(current);
  return THEME_PREFERENCES[(index + 1) % THEME_PREFERENCES.length];
}

/** Subconjunto de Storage que se usa; null si el navegador bloquea el acceso. */
export type ThemeStorage = Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;

/** Lee la preferencia guardada; si el almacenamiento falla (modo privado), sigue al sistema. */
export function readThemePreference(storage: ThemeStorage): ThemePreference {
  try {
    return parseThemePreference(storage?.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

/** Guarda la preferencia. Devuelve false si no se pudo (la elección dura solo esta sesión). */
export function writeThemePreference(storage: ThemeStorage, preference: ThemePreference): boolean {
  if (!storage) return false;
  try {
    if (preference === "system") storage.removeItem(THEME_STORAGE_KEY);
    else storage.setItem(THEME_STORAGE_KEY, preference);
    return true;
  } catch {
    return false;
  }
}

/**
 * Script en línea que se ejecuta en <head> antes del primer pintado: aplica en
 * <html data-theme> el tema guardado o, si no hay, el del sistema. Así no hay parpadeo.
 * Repite en ES5 la lógica de parseThemePreference + resolveTheme (lo cubren los tests).
 */
export const themeInitScript = `(function(){var d=document.documentElement;try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("${DARK_SCHEME_QUERY}").matches?"dark":"light"}d.dataset.theme=t}catch(e){}})()`;
