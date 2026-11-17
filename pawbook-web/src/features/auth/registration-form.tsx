"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { MIN_SIGNUP_AGE, signUp, TERMS_VERSION } from "./auth-api";
import { FieldErrorText, FormAlert, SubmitButton, TextField } from "./form-fields";
import { GoogleButton } from "./google-button";
import { CHECK_EMAIL_PATH, ONBOARDING_START_PATH } from "./guards";
import { useAuthForm } from "./use-auth-form";
import { PASSWORD_MIN_LENGTH, type SignUpField, validateSignUp } from "./validation";

/** Errores de la API por ruta del contrato → campo del formulario. */
const API_FIELDS: Readonly<Record<string, SignUpField>> = {
  email: "email",
  password: "password",
  birthDate: "birthDate",
  termsVersion: "acceptedTerms",
};

function readForm(data: FormData) {
  return {
    email: String(data.get("email") ?? ""),
    password: String(data.get("password") ?? ""),
    birthDate: String(data.get("birthDate") ?? ""),
    acceptedTerms: data.get("terms") === "on",
  };
}

export function RegistrationForm() {
  const t = useTranslations("registration");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const form = useAuthForm({
    validate: (data) => validateSignUp(readForm(data), TERMS_VERSION),
    submit: signUp,
    // Con o sin sesión (el correo podía tener ya cuenta), la siguiente pantalla es la misma.
    onSuccess: () => router.push(CHECK_EMAIL_PATH),
    apiFields: API_FIELDS,
  });

  /** Para crear la cuenta con Google hacen falta la fecha de nacimiento y los términos. */
  function googleRegistrationData() {
    if (formRef.current === null) return null;
    const input = readForm(new FormData(formRef.current));
    return input.acceptedTerms && input.birthDate
      ? { birthDate: input.birthDate, termsVersion: TERMS_VERSION }
      : null;
  }

  const termsError = form.fieldError("acceptedTerms");

  return (
    <div className="flex flex-col gap-4">
      <GoogleButton
        registrationData={googleRegistrationData}
        onSignedIn={({ isNewUser }) => router.push(isNewUser ? ONBOARDING_START_PATH : "/")}
      />
      <div className="flex items-center gap-2.5 text-[13px] text-muted">
        <span className="h-px flex-1 bg-line" />
        {tAuth("orEmail")}
        <span className="h-px flex-1 bg-line" />
      </div>

      <form ref={formRef} noValidate onSubmit={form.onSubmit} className="flex flex-col gap-3">
        <FormAlert message={form.alert} />
        <TextField
          name="email"
          type="email"
          autoComplete="email"
          label={t("email")}
          placeholder={t("emailPlaceholder")}
          error={form.fieldError("email")}
        />
        <TextField
          name="password"
          type="password"
          autoComplete="new-password"
          label={t("password")}
          placeholder={t("passwordPlaceholder", { min: PASSWORD_MIN_LENGTH })}
          error={form.fieldError("password")}
        />
        <TextField
          name="birthDate"
          type="date"
          autoComplete="bday"
          label={t("birthDate")}
          hint={t("birthDateHint")}
          error={form.fieldError("birthDate")}
        />
        <label className="flex items-start gap-2.5 text-[13px] leading-snug text-ink-2">
          <input
            name="terms"
            type="checkbox"
            aria-invalid={Boolean(termsError)}
            aria-describedby="terms-error"
            className="mt-0.5 size-5 shrink-0 accent-primary"
          />
          <span>
            {t.rich("terms", {
              minAge: MIN_SIGNUP_AGE,
              terms: (chunks) => (
                <Link href="#" className="font-semibold text-primary-ink">
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link href="#" className="font-semibold text-primary-ink">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>
        <FieldErrorText id="terms-error" error={termsError} />
        <SubmitButton pending={form.pending} label={t("submit")} pendingLabel={t("submitting")} />
        <p className="text-center text-xs text-muted">{t("verifyNotice")}</p>
      </form>
    </div>
  );
}
