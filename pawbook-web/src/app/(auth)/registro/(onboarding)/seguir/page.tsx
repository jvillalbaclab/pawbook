import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FollowSuggestions } from "@/features/auth/follow-suggestions";
import { OnboardingHeader } from "@/features/auth/onboarding-header";
import { FOLLOW_TARGET } from "@/features/auth/registration";
import { VerifyEmailBanner } from "@/features/auth/verify-email-banner";
import { getOnboardingSuggestions } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("followStep");
  return { title: t("title") };
}

export default async function FollowStepPage() {
  const [suggestions, t] = await Promise.all([
    getOnboardingSuggestions(),
    getTranslations("followStep"),
  ]);
  return (
    <div className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-4 px-5 pt-4">
      <OnboardingHeader step={3} backHref="/registro/mascota" />
      <VerifyEmailBanner />
      <div>
        <h1 className="font-display text-[26px] font-extrabold tracking-tight text-ink">
          {t("heading")}
        </h1>
        <p className="mt-1.5 text-sm text-ink-2">{t("description", { count: FOLLOW_TARGET })}</p>
      </div>
      <FollowSuggestions pets={suggestions} />
    </div>
  );
}
