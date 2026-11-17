"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { MailIcon } from "@/design-system/icons";
import { isApiError } from "@/lib/api-client/problem";
import { useAuthStore } from "@/stores/auth";
import { reloadUser, resendVerification } from "./auth-api";
import {
  FormAlert,
  FormNotice,
  PRIMARY_BUTTON_CLASSES,
  SECONDARY_BUTTON_CLASSES,
} from "./form-fields";
import { CHECK_EMAIL_PATH, ONBOARDING_START_PATH, signInUrl } from "./guards";
import { problemMessage } from "./messages";

/**
 * "Revisa tu correo" tras el registro. El texto es el mismo exista o no la cuenta. Con
 * sesión se puede seguir con el onboarding sin haber verificado (crear la mascota no lo
 * exige) y reenviar el enlace; sin sesión, invita a iniciar sesión.
 */
export function CheckEmail() {
  const t = useTranslations("auth");
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  const resend = useMutation({
    mutationFn: resendVerification,
    // 409: ya estaba verificado (en otra pestaña o dispositivo); se actualiza la sesión.
    onError: (error) => {
      if (isApiError(error) && error.code === "conflict") void reloadUser();
    },
  });
  const resendError =
    resend.error && !(isApiError(resend.error) && resend.error.code === "conflict")
      ? problemMessage(resend.error)
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-control border border-line bg-surface p-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-tint text-brand">
          <MailIcon size={24} />
        </span>
        <p className="text-sm text-ink-2">
          {user ? t("checkEmail.sentTo", { email: user.email }) : t("checkEmail.sent")}
        </p>
      </div>
      <p className="text-[13px] text-muted">{t("checkEmail.spam")}</p>

      {status === "authenticated" ? (
        <>
          {resend.isSuccess ? <FormNotice>{t("checkEmail.resent")}</FormNotice> : null}
          <FormAlert message={resendError} />
          <Link href={ONBOARDING_START_PATH} className={PRIMARY_BUTTON_CLASSES}>
            {t("checkEmail.continue")}
          </Link>
          {user?.emailVerified ? null : (
            <button
              type="button"
              disabled={resend.isPending}
              onClick={() => resend.mutate()}
              className={SECONDARY_BUTTON_CLASSES}
            >
              {resend.isPending ? t("checkEmail.resending") : t("checkEmail.resend")}
            </button>
          )}
        </>
      ) : null}

      {status === "anonymous" ? (
        <p className="text-center text-sm text-ink-2">
          {t.rich("checkEmail.signInToContinue", {
            login: (chunks) => (
              <Link href={signInUrl(CHECK_EMAIL_PATH)} className="font-bold text-primary-ink">
                {chunks}
              </Link>
            ),
          })}
        </p>
      ) : null}
    </div>
  );
}
