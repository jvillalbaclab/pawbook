import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/features/auth/auth-shell";
import { SIGN_IN_PATH } from "@/features/auth/guards";
import { RegistrationForm } from "@/features/auth/registration-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("registration");
  return { title: t("title") };
}

export default function RegistrationPage() {
  const t = useTranslations("registration");
  return (
    <AuthShell
      title={t("title")}
      mobileTitle={t("heroTitle")}
      description={t("nextStep")}
      footer={t.rich("haveAccount", {
        login: (chunks) => (
          <Link href={SIGN_IN_PATH} className="font-bold text-primary-ink">
            {chunks}
          </Link>
        ),
      })}
    >
      <RegistrationForm />
    </AuthShell>
  );
}
