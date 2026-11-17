"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckIcon, CloseIcon } from "@/design-system/icons";
import { EmptyState, STATE_ACTION_CLASSES } from "@/design-system/states";
import { isApiError } from "@/lib/api-client/problem";
import { resetPassword } from "./auth-api";
import { FormAlert, SubmitButton, TextField } from "./form-fields";
import { useFragmentToken } from "./fragment-token";
import { SIGN_IN_PATH } from "./guards";
import { useAuthForm } from "./use-auth-form";
import { PASSWORD_MIN_LENGTH, validateNewPassword } from "./validation";

const FORGOT_PATH = "/recuperar-contrasena";

/** Restablecer la contraseña con el token del enlace (`#token=`, válido 1 h y de un solo uso). */
export function ResetPasswordForm() {
  const token = useFragmentToken();
  if (token === undefined) return null;
  if (token === null) return <LinkProblem kind="invalid" />;
  return <NewPasswordForm token={token} />;
}

function NewPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const form = useAuthForm({
    validate: (data) =>
      validateNewPassword({
        password: String(data.get("password") ?? ""),
        confirmation: String(data.get("confirmation") ?? ""),
      }),
    submit: (password: string) => resetPassword(token, password),
    apiFields: { newPassword: "password" },
  });

  if (form.succeeded) {
    return (
      <EmptyState
        role="status"
        icon={<CheckIcon size={40} />}
        title={t("reset.successTitle")}
        description={t("reset.successDescription")}
        action={
          <Link href={SIGN_IN_PATH} className={STATE_ACTION_CLASSES.primary}>
            {t("reset.goToLogin")}
          </Link>
        }
      />
    );
  }
  if (isApiError(form.error) && form.error.code === "link-expired") {
    return <LinkProblem kind="expired" />;
  }
  if (isApiError(form.error) && form.error.code === "invalid-link") {
    return <LinkProblem kind="invalid" />;
  }

  return (
    <form noValidate onSubmit={form.onSubmit} className="flex flex-col gap-3">
      <FormAlert message={form.alert} />
      <TextField
        name="password"
        type="password"
        autoComplete="new-password"
        label={t("reset.password")}
        placeholder={t("reset.passwordPlaceholder", { min: PASSWORD_MIN_LENGTH })}
        error={form.fieldError("password")}
      />
      <TextField
        name="confirmation"
        type="password"
        autoComplete="new-password"
        label={t("reset.confirmation")}
        error={form.fieldError("confirmation")}
      />
      <SubmitButton
        pending={form.pending}
        label={t("reset.submit")}
        pendingLabel={t("reset.submitting")}
      />
    </form>
  );
}

function LinkProblem({ kind }: { kind: "invalid" | "expired" }) {
  const t = useTranslations("auth");
  return (
    <EmptyState
      role="alert"
      tone="neutral"
      icon={<CloseIcon size={40} />}
      title={kind === "expired" ? t("reset.expiredTitle") : t("reset.invalidTitle")}
      description={
        kind === "expired" ? t("reset.expiredDescription") : t("reset.invalidDescription")
      }
      action={
        <Link href={FORGOT_PATH} className={STATE_ACTION_CLASSES.primary}>
          {t("reset.requestNew")}
        </Link>
      }
    />
  );
}
