import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/features/auth/auth-shell";
import { CheckEmail } from "@/features/auth/check-email";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("checkEmail.title") };
}

/** "Revisa tu correo" tras crear la cuenta. Sin diseño propio todavía (T-M0.50). */
export default function CheckEmailPage() {
  const t = useTranslations("auth");
  return (
    <AuthShell title={t("checkEmail.title")} description={t("checkEmail.description")}>
      <CheckEmail />
    </AuthShell>
  );
}
