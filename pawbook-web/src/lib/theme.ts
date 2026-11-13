export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "pawbook-theme";

/**
 * Script en línea que se ejecuta en <head> antes del primer pintado.
 * Lee el tema guardado o, si no hay, la preferencia del sistema, y lo deja en
 * <html data-theme>. Así no hay parpadeo de tema claro al cargar en oscuro.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})()`;

/** Devuelve el tema contrario; separado para poder probarlo sin DOM. */
export function nextTheme(current: Theme): Theme {
  return current === "dark" ? "light" : "dark";
}

/** Normaliza cualquier valor leído del DOM o del almacenamiento. */
export function parseTheme(value: string | null | undefined): Theme {
  return value === "dark" ? "dark" : "light";
}
