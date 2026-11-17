"use client";

import Link from "next/link";
import { useEffect } from "react";
import { PawIcon } from "@/design-system/icons";
import { ErrorState, STATE_ACTION_CLASSES } from "@/design-system/states";

/** Error inesperado en una sección: el armazón (menú y barras) sigue funcionando. */
export default function SectionError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // Hasta tener observabilidad (Sentry), al menos queda en la consola del navegador.
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      icon={<PawIcon size={44} />}
      title="Algo no ha ido bien"
      onRetry={retry}
      secondaryAction={
        <Link href="/" className={STATE_ACTION_CLASSES.link}>
          Volver al inicio
        </Link>
      }
    />
  );
}
