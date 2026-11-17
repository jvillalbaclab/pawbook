import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/features/auth/auth-shell";
import { VerifyEmailResult } from "@/features/auth/verify-email-result";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("verify.title"), referrer: "no-referrer", robots: { index: false } };
}

/**
 * Destino del enlace de verificación (`/verificar-correo#token=…`, lo fija la API).
 * Sin diseño propio todavía (T-M0.50): usa el lenguaje del registro.
 */
export default function VerifyEmailPage() {
  const t = useTranslations("auth");
  return (
    <AuthShell title={t("verify.title")}>
      <VerifyEmailResult />
    </AuthShell>
  );
}
