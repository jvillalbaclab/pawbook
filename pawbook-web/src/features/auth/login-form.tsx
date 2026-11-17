"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { signIn } from "./auth-api";
import { FormAlert, SubmitButton, TextField } from "./form-fields";
import { GoogleButton } from "./google-button";
import { ONBOARDING_START_PATH, returnPathFromSearch } from "./guards";
import { useAuthForm } from "./use-auth-form";
import { validateSignIn } from "./validation";

/** Ruta a la que volver tras entrar (`?volver=`); se lee al navegar, sin useSearchParams. */
function returnPath(): string {
  return returnPathFromSearch(window.location.search);
}

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  // Con sesión ya abierta (p. ej. recuperada con la cookie), el login no tiene sentido.
  useEffect(() => {
    if (status === "authenticated") router.replace(returnPath());
  }, [status, router]);

  const form = useAuthForm({
    validate: (data) =>
      validateSignIn({
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
      }),
    submit: signIn,
    onSuccess: () => router.replace(returnPath()),
    apiFields: { email: "email", password: "password" },
    context: "sign-in",
  });

  return (
    <div className="flex flex-col gap-4">
      <GoogleButton
        onSignedIn={({ isNewUser }) =>
          router.replace(isNewUser ? ONBOARDING_START_PATH : returnPath())
        }
      />
      <div className="flex items-center gap-2.5 text-[13px] text-muted">
        <span className="h-px flex-1 bg-line" />
        {t("orEmail")}
        <span className="h-px flex-1 bg-line" />
      </div>

      <form noValidate onSubmit={form.onSubmit} className="flex flex-col gap-3">
        <FormAlert message={form.alert} />
        <TextField
          name="email"
          type="email"
          autoComplete="email"
          label={t("login.email")}
          placeholder={t("login.emailPlaceholder")}
          error={form.fieldError("email")}
        />
        <TextField
          name="password"
          type="password"
          autoComplete="current-password"
          label={t("login.password")}
          error={form.fieldError("password")}
        />
        <Link
          href="/recuperar-contrasena"
          className="self-end text-[13px] font-semibold text-primary-ink"
        >
          {t("login.forgot")}
        </Link>
        <SubmitButton
          pending={form.pending}
          label={t("login.submit")}
          pendingLabel={t("login.submitting")}
        />
      </form>
    </div>
  );
}
