import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";
import { APP_BACKGROUND } from "@/design-system/app-icon";
import { FORMAT_LOCALE } from "@/i18n/config";

/** Manifiesto de la PWA instalable (UI-007). Se sirve en /manifest.webmanifest. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("metadata");
  return {
    name: t("title"),
    short_name: t("title"),
    description: t("description"),
    lang: FORMAT_LOCALE,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: APP_BACKGROUND,
    theme_color: APP_BACKGROUND,
    categories: ["social", "lifestyle"],
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
