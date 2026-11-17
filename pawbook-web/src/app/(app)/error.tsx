"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { PawIcon } from "@/design-system/icons";
import { ErrorState, STATE_ACTION_CLASSES } from "@/design-system/states";

/** Error inesperado en una sección: el armazón (menú y barras) sigue funcionando. */
export default function SectionError({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("states");
  useEffect(() => {
    // Hasta tener observabilidad (Sentry), al menos queda en la consola del navegador.
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      icon={<PawIcon size={44} />}
      title={t("sectionErrorTitle")}
      onRetry={retry}
      secondaryAction={
        <Link href="/" className={STATE_ACTION_CLASSES.link}>
          {t("backHome")}
        </Link>
      }
    />
  );
}
