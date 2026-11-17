"use client";

import { useTranslations } from "next-intl";
import { requestPasswordReset } from "./auth-api";
import { FormAlert, FormNotice, SubmitButton, TextField } from "./form-fields";
import { useAuthForm } from "./use-auth-form";
import { validateEmail } from "./validation";

/**
 * "Olvidé mi contraseña" (FR-AUTH-005). La API responde igual exista o no la cuenta, y la
 * pantalla también: el aviso nunca dice si el correo está registrado.
 */
export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const form = useAuthForm({
    validate: (data) => validateEmail({ email: String(data.get("email") ?? "") }),
    submit: requestPasswordReset,
    apiFields: { email: "email" },
  });

  return (
    <form noValidate onSubmit={form.onSubmit} className="flex flex-col gap-3">
      {form.succeeded ? <FormNotice>{t("forgot.sent")}</FormNotice> : null}
      <FormAlert message={form.alert} />
      <TextField
        name="email"
        type="email"
        autoComplete="email"
        label={t("login.email")}
        placeholder={t("login.emailPlaceholder")}
        error={form.fieldError("email")}
      />
      <SubmitButton
        pending={form.pending}
        label={form.succeeded ? t("forgot.resubmit") : t("forgot.submit")}
        pendingLabel={t("forgot.submitting")}
      />
    </form>
  );
}
