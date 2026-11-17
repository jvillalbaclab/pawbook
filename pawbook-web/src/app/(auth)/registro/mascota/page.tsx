import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { OnboardingHeader } from "@/features/auth/onboarding-header";
import { PetForm } from "@/features/auth/pet-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("petStep");
  return { title: t("title") };
}

export default function PetStepPage() {
  const t = useTranslations("petStep");
  return (
    <div className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-5 px-5 py-4">
      <OnboardingHeader step={2} backHref="/registro" />
      <div>
        <h1 className="font-display text-[26px] font-extrabold tracking-tight text-ink">
          {t("title")}
        </h1>
        <p className="mt-1.5 text-sm text-ink-2">{t("description")}</p>
      </div>
      <PetForm />
    </div>
  );
}
