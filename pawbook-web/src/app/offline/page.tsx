import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PawIcon } from "@/design-system/icons";
import { EmptyState, STATE_ACTION_CLASSES } from "@/design-system/states";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("offline");
  return { title: t("title"), robots: { index: false } };
}

/**
 * Página sin conexión (UI-007). El service worker la guarda al instalarse y la sirve
 * cuando una navegación falla sin red. No necesita JavaScript: el botón es un enlace.
 */
export default async function OfflinePage() {
  const t = await getTranslations("offline");
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <EmptyState
        tone="neutral"
        icon={<PawIcon size={44} />}
        title={t("title")}
        description={t("description")}
        action={
          <a href="/" className={STATE_ACTION_CLASSES.inverse}>
            {t("retry")}
          </a>
        }
      />
    </main>
  );
}
