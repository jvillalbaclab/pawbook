import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/features/auth/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { SIGN_IN_PATH } from "@/features/auth/guards";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("forgot.title") };
}

/** "Olvidé mi contraseña". Sin diseño propio todavía (T-M0.50): usa el lenguaje del registro. */
export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  return (
    <AuthShell
      title={t("forgot.title")}
      description={t("forgot.description")}
      footer={
        <Link href={SIGN_IN_PATH} className="font-bold text-primary-ink">
          {t("forgot.backToLogin")}
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
