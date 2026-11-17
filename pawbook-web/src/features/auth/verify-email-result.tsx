"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { CheckIcon, CloseIcon, MailIcon } from "@/design-system/icons";
import { EmptyState, LoadingState, Skeleton, STATE_ACTION_CLASSES } from "@/design-system/states";
import { isApiError } from "@/lib/api-client/problem";
import { useAuthStore } from "@/stores/auth";
import { resendVerification, verifyEmail } from "./auth-api";
import { FormAlert, FormNotice } from "./form-fields";
import { useFragmentToken } from "./fragment-token";
import { ONBOARDING_START_PATH, SIGN_IN_PATH, signInUrl } from "./guards";
import { problemMessage } from "./messages";

/**
 * Resultado de abrir el enlace de verificación (FR-AUTH-002): verificando, verificado,
 * caducado (con reenvío si hay sesión) o no válido. El token se envía UNA sola vez: es de un
 * solo uso y repetirlo daría "enlace no válido".
 */
export function VerifyEmailResult() {
  const t = useTranslations("auth");
  const token = useFragmentToken();
  const verification = useMutation({ mutationFn: verifyEmail });
  const sent = useRef(false);

  useEffect(() => {
    if (token && !sent.current) {
      sent.current = true;
      verification.mutate(token);
    }
  }, [token, verification]);

  if (token === undefined || (token !== null && (verification.isIdle || verification.isPending))) {
    return (
      <LoadingState
        label={t("verify.verifying")}
        className="flex flex-col items-center gap-3 py-12"
      >
        <Skeleton className="size-24 rounded-full" />
        <Skeleton className="h-5 w-48 rounded-full" />
      </LoadingState>
    );
  }
  if (verification.isSuccess) return <Verified />;
  if (isApiError(verification.error) && verification.error.code === "link-expired") {
    return <Expired />;
  }
  const invalidLink = isApiError(verification.error) && verification.error.code === "invalid-link";
  if (verification.error && !invalidLink) {
    return (
      <div className="flex flex-col gap-3">
        <FormAlert message={problemMessage(verification.error)} />
        <button
          type="button"
          onClick={() => token && verification.mutate(token)}
          className={STATE_ACTION_CLASSES.inverse}
        >
          {t("verify.retry")}
        </button>
      </div>
    );
  }
  return (
    <EmptyState
      role="alert"
      tone="neutral"
      icon={<CloseIcon size={40} />}
      title={t("verify.invalidTitle")}
      description={t("verify.invalidDescription")}
      action={
        <Link href={SIGN_IN_PATH} className={STATE_ACTION_CLASSES.primary}>
          {t("verify.signIn")}
        </Link>
      }
    />
  );
}

function Verified() {
  const t = useTranslations("auth");
  const status = useAuthStore((state) => state.status);
  return (
    <EmptyState
      role="status"
      icon={<CheckIcon size={40} />}
      title={t("verify.successTitle")}
      description={t("verify.successDescription")}
      action={
        <Link
          href={
            status === "authenticated" ? ONBOARDING_START_PATH : signInUrl(ONBOARDING_START_PATH)
          }
          className={STATE_ACTION_CLASSES.primary}
        >
          {status === "authenticated" ? t("verify.continue") : t("verify.signIn")}
        </Link>
      }
    />
  );
}

function Expired() {
  const t = useTranslations("auth");
  const status = useAuthStore((state) => state.status);
  const resend = useMutation({ mutationFn: resendVerification });
  return (
    <EmptyState
      role="alert"
      tone="neutral"
      icon={<MailIcon size={40} />}
      title={t("verify.expiredTitle")}
      description={t("verify.expiredDescription")}
      action={
        status === "authenticated" ? (
          <div className="flex w-full max-w-sm flex-col items-center gap-3">
            {resend.isSuccess ? <FormNotice>{t("verify.resent")}</FormNotice> : null}
            <FormAlert message={resend.error ? problemMessage(resend.error) : null} />
            <button
              type="button"
              disabled={resend.isPending}
              onClick={() => resend.mutate()}
              className={STATE_ACTION_CLASSES.primary}
            >
              {resend.isPending ? t("checkEmail.resending") : t("verify.resend")}
            </button>
          </div>
        ) : (
          <Link
            href={signInUrl("/registro/revisa-tu-correo")}
            className={STATE_ACTION_CLASSES.primary}
          >
            {t("verify.signInToResend")}
          </Link>
        )
      }
    />
  );
}
