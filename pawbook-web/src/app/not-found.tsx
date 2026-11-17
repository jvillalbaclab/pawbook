import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PawIcon } from "@/design-system/icons";
import { EmptyState, STATE_ACTION_CLASSES } from "@/design-system/states";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("notFoundTitle") };
}

export default async function NotFound() {
  const t = await getTranslations("states");
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <EmptyState
        tone="neutral"
        icon={<PawIcon size={44} />}
        title={t("notFoundTitle")}
        description={t("notFoundDescription")}
        action={
          <Link href="/" className={STATE_ACTION_CLASSES.inverse}>
            {t("backHome")}
          </Link>
        }
      />
    </main>
  );
}
