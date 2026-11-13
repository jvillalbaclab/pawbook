"use client";

import { useEffect, useState } from "react";
import { nextTheme, parseTheme, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";
import { MoonIcon, SunIcon } from "./icons";

export function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  // null hasta montar: el tema real solo se conoce en el navegador.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(parseTheme(document.documentElement.dataset.theme));
  }, []);

  function toggle() {
    const next = nextTheme(theme ?? "light");
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Almacenamiento bloqueado (modo privado): el tema dura solo esta sesión.
    }
    setTheme(next);
  }

  const label = theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={withLabel ? undefined : label}
      className={`flex h-11 items-center gap-3 rounded-2xl text-ink-2 hover:bg-surface-2 ${
        withLabel ? "px-3.5 text-[15px] font-semibold" : "w-11 justify-center"
      }`}
    >
      {theme === "dark" ? <SunIcon size={21} /> : <MoonIcon size={21} />}
      {withLabel && <span>{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>}
    </button>
  );
}
