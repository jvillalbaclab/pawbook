import type { Metadata } from "next";
import Link from "next/link";
import { PawIcon } from "@/design-system/icons";
import { EmptyState, STATE_ACTION_CLASSES } from "@/design-system/states";

export const metadata: Metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <EmptyState
        tone="neutral"
        icon={<PawIcon size={44} />}
        title="Esta página no existe"
        description="Puede que el enlace esté mal escrito o que la página se haya movido."
        action={
          <Link href="/" className={STATE_ACTION_CLASSES.inverse}>
            Volver al inicio
          </Link>
        }
      />
    </main>
  );
}
