import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/features/auth/auth-shell";
import { LoginForm } from "@/features/auth/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("login.title") };
}

/** Inicio de sesión. Sin diseño propio todavía (T-M0.50): usa el lenguaje del registro. */
export default function SignInPage() {
  const t = useTranslations("auth");
  return (
    <AuthShell
      title={t("login.title")}
      description={t("login.description")}
      footer={t.rich("login.noAccount", {
        signup: (chunks) => (
          <Link href="/registro" className="font-bold text-primary-ink">
            {chunks}
          </Link>
        ),
      })}
    >
      <LoginForm />
    </AuthShell>
  );
}
