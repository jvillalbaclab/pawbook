"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { isApiError } from "@/lib/api-client/problem";
import { googleSignIn } from "./auth-api";
import { SECONDARY_BUTTON_CLASSES } from "./form-fields";

/*
 * Botón "Continuar con Google" (FR-AUTH-003). El ID token lo da Google Identity Services
 * (GIS), que solo se descarga al pulsar y solo si hay client ID: sin NEXT_PUBLIC_GOOGLE_CLIENT_ID
 * el botón aparece desactivado con un aviso, y si la API responde `auth-provider-disabled`
 * se desactiva igual. No hay credenciales de Google en el repositorio.
 */

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const GIS_SCRIPT = "https://accounts.google.com/gsi/client";

type GoogleCredentialResponse = { credential?: string };
type PromptNotification = {
  isNotDisplayed?: () => boolean;
  isSkippedMoment?: () => boolean;
  isDismissedMoment?: () => boolean;
};
type GoogleIdentity = {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }): void;
      prompt(listener?: (notification: PromptNotification) => void): void;
    };
  };
};

let gisLoading: Promise<GoogleIdentity> | null = null;

function loadGoogleIdentity(): Promise<GoogleIdentity> {
  gisLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SCRIPT;
    script.async = true;
    script.onload = () => {
      const google = (window as Window & { google?: GoogleIdentity }).google;
      if (google) resolve(google);
      else reject(new Error("Google Identity Services no está disponible"));
    };
    script.onerror = () => {
      gisLoading = null;
      reject(new Error("No se pudo cargar Google Identity Services"));
    };
    document.head.append(script);
  });
  return gisLoading;
}

/** Pide el ID token a Google: abre el selector de cuenta y resuelve con la credencial. */
async function requestIdToken(): Promise<string> {
  const google = await loadGoogleIdentity();
  return new Promise((resolve, reject) => {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: ({ credential }) =>
        credential ? resolve(credential) : reject(new Error("Google no devolvió credencial")),
    });
    // Si el usuario cierra el selector, la operación termina en vez de quedarse pendiente.
    google.accounts.id.prompt((notification) => {
      if (
        notification.isNotDisplayed?.() ||
        notification.isSkippedMoment?.() ||
        notification.isDismissedMoment?.()
      ) {
        reject(new Error("Inicio de sesión con Google cancelado"));
      }
    });
  });
}

type GoogleNotice = "unavailable" | "registrationRequired" | "forbidden" | "failed";

export function GoogleButton({
  registrationData,
  onSignedIn,
}: {
  /** En el registro: fecha de nacimiento y términos para crear la cuenta si es nueva. */
  registrationData?: () => { birthDate: string; termsVersion: string } | null;
  onSignedIn: (result: { isNewUser: boolean; emailVerified: boolean }) => void;
}) {
  const t = useTranslations("auth");
  const [disabled, setDisabled] = useState(GOOGLE_CLIENT_ID === "");
  const mutation = useMutation({
    mutationFn: async () => {
      const idToken = await requestIdToken();
      return googleSignIn({ idToken, ...(registrationData?.() ?? {}) });
    },
    onSuccess: ({ user, isNewUser }) =>
      onSignedIn({ isNewUser, emailVerified: user.emailVerified }),
    onError: (error) => {
      if (isApiError(error) && error.code === "auth-provider-disabled") setDisabled(true);
    },
  });

  const notice: GoogleNotice | null = disabled
    ? "unavailable"
    : !mutation.error
      ? null
      : isApiError(mutation.error) && mutation.error.code === "validation-failed"
        ? "registrationRequired"
        : isApiError(mutation.error) && mutation.error.code === "forbidden"
          ? "forbidden"
          : "failed";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={disabled || mutation.isPending}
        aria-describedby={notice ? "google-notice" : undefined}
        onClick={() => mutation.mutate()}
        className={SECONDARY_BUTTON_CLASSES}
      >
        <span
          aria-hidden="true"
          className="flex size-6 items-center justify-center rounded-full border-[1.5px] border-ink text-[13px] font-extrabold"
        >
          G
        </span>
        {mutation.isPending ? t("google.loading") : t("google.button")}
      </button>
      {notice ? (
        <p id="google-notice" className="text-center text-[13px] text-ink-2">
          {t(`google.notices.${notice}`)}
        </p>
      ) : null}
    </div>
  );
}
