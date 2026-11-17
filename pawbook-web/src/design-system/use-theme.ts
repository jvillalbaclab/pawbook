"use client";

import { useSyncExternalStore } from "react";
import {
  DARK_SCHEME_QUERY,
  readThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
  type ThemeStorage,
  writeThemePreference,
} from "@/lib/theme";

/*
 * Estado del tema compartido por todos los conmutadores montados (menú lateral y barra
 * móvil). El script de <head> ya pintó el tema correcto; esto solo lo mantiene al día:
 * cambios del usuario, del sistema (si la preferencia es "system") y de otras pestañas.
 */

let preference: ThemePreference | null = null;
const listeners = new Set<() => void>();

/** Acceder a localStorage puede lanzar (cookies bloqueadas): se trata como sin almacenamiento. */
function storage(): ThemeStorage {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function systemPrefersDark(): boolean {
  return window.matchMedia(DARK_SCHEME_QUERY).matches;
}

function apply(next: ThemePreference) {
  preference = next;
  document.documentElement.dataset.theme = resolveTheme(next, systemPrefersDark());
  for (const listener of listeners) listener();
}

function onSystemChange() {
  if (preference === "system") apply("system");
}

function onStorage(event: StorageEvent) {
  if (event.key === THEME_STORAGE_KEY || event.key === null) {
    apply(readThemePreference(storage()));
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.matchMedia(DARK_SCHEME_QUERY).addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.matchMedia(DARK_SCHEME_QUERY).removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    }
  };
}

function getSnapshot(): ThemePreference {
  preference ??= readThemePreference(storage());
  return preference;
}

/** En servidor la preferencia no se conoce: null hasta hidratar. */
function getServerSnapshot(): ThemePreference | null {
  return null;
}

export function setThemePreference(next: ThemePreference) {
  writeThemePreference(storage(), next);
  apply(next);
}

/** Preferencia de tema actual (null durante el render de servidor). */
export function useThemePreference(): ThemePreference | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
