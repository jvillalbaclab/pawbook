import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/features/auth/auth-shell";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  // El enlace lleva el token en el fragmento: que ninguna página enlazada lo reciba.
  return { title: t("reset.title"), referrer: "no-referrer", robots: { index: false } };
}

/**
 * Destino del enlace de recuperación (`/restablecer-contrasena#token=…`, lo fija la API).
 * Sin diseño propio todavía (T-M0.50): usa el lenguaje del registro.
 */
export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  return (
    <AuthShell title={t("reset.title")} description={t("reset.description")}>
      <ResetPasswordForm />
    </AuthShell>
  );
}
