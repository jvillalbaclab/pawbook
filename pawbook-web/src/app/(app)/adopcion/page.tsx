import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { VerifiedBadge } from "@/design-system/icons";
import { AdoptionBrowser } from "@/features/adoption/adoption-browser";
import { listAdoptions } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adoption");
  return { title: t("title"), description: t("description") };
}

export default async function AdoptionPage() {
  const [listings, t] = await Promise.all([listAdoptions(), getTranslations("adoption")]);
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-success-ink">
          <VerifiedBadge size={16} />
          {t("verifiedOnly")}
        </p>
      </header>
      <AdoptionBrowser listings={listings} />
    </div>
  );
}
