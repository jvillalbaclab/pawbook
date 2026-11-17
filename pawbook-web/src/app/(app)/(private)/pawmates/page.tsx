import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { PinIcon } from "@/design-system/icons";
import { PawMatesView } from "@/features/pawmates/pawmates-view";

/** Radio de búsqueda de PawMates en el MVP (ubicación aproximada). */
const SEARCH_RADIUS_KM = 5;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pawmates");
  return { title: t("title") };
}

export default function PawMatesPage() {
  const t = useTranslations("pawmates");
  return (
    <div className="flex flex-col gap-4">
      <header className="mx-auto w-full max-w-md">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
          {t("title")}
        </h1>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
          <PinIcon size={14} />
          {t("radius", { km: SEARCH_RADIUS_KM })}
        </p>
      </header>
      <PawMatesView />
    </div>
  );
}
