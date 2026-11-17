"use client";

import { useTranslations } from "next-intl";
import { nextThemePreference } from "@/lib/theme";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";
import { setThemePreference, useThemePreference } from "./use-theme";

const ICONS = { system: MonitorIcon, light: SunIcon, dark: MoonIcon } as const;

/**
 * Conmutador de tema (UI-006): recorre automático (sigue al sistema) → claro → oscuro.
 * Antes de hidratar muestra el icono de "automático" sin texto de estado, para que el
 * HTML del servidor coincida con el del cliente.
 */
export function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const t = useTranslations("theme");
  const preference = useThemePreference();
  const current = preference ?? "system";
  const next = nextThemePreference(current);
  const Icon = ICONS[current];
  const label = t("toggleLabel", { current: t(current), next: t(next) });

  return (
    <button
      type="button"
      onClick={() => setThemePreference(next)}
      aria-label={label}
      title={label}
      className={`flex h-11 items-center gap-3 rounded-2xl text-ink-2 hover:bg-surface-2 ${
        withLabel ? "px-3.5 text-[15px] font-semibold" : "w-11 justify-center"
      }`}
    >
      <Icon size={21} />
      {withLabel && (
        <span aria-hidden="true">
          {t("label")} {preference ? t(current) : ""}
        </span>
      )}
    </button>
  );
}
