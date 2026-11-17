"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { isApiError } from "@/lib/api-client/problem";
import { useAuthStore } from "@/stores/auth";
import { reloadUser, resendVerification } from "./auth-api";

/**
 * Aviso "verifica tu correo" con reenvío (paso 3 del onboarding). No bloquea: solo informa
 * de que publicar, comentar, seguir y chatear exigen el correo verificado (FR-AUTH-006).
 * No se pinta sin sesión o con el correo ya verificado.
 */
export function VerifyEmailBanner() {
  const t = useTranslations("followStep");
  const user = useAuthStore((state) => state.user);
  const resend = useMutation({
    mutationFn: resendVerification,
    // 409: ya estaba verificado (p. ej. desde otro dispositivo); se actualiza la sesión.
    onError: (error) => {
      if (isApiError(error) && error.code === "conflict") void reloadUser();
    },
  });

  if (user === null || user.emailVerified) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-2.5 rounded-control border border-warn-line bg-warn-tint px-3 py-2.5 text-[13px] text-warn-ink"
    >
      <span className="flex-1">
        {resend.isSuccess ? t("resent") : resend.isError ? t("resendFailed") : t("verifyEmail")}
      </span>
      {resend.isSuccess ? null : (
        <button
          type="button"
          disabled={resend.isPending}
          onClick={() => resend.mutate()}
          className="font-bold underline disabled:opacity-60"
        >
          {t("resend")}
        </button>
      )}
    </div>
  );
}
