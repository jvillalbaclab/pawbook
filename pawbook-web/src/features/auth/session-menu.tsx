"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogoutIcon } from "@/design-system/icons";
import { clearPrivatePageCaches } from "@/features/shell/service-worker";
import { useAuthStore } from "@/stores/auth";
import { signOut } from "./auth-api";
import { SIGN_IN_PATH } from "./guards";

/**
 * Cerrar sesión: revoca la sesión en la API (y su cookie), olvida el access token, vacía la
 * caché de TanStack Query y las páginas que guardó el service worker, y vuelve al login.
 */
export function useSignOut() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async () => {
      await signOut();
      queryClient.clear();
      await clearPrivatePageCaches();
    },
    onSettled: () => router.replace(SIGN_IN_PATH),
  });
}

/**
 * Acceso a la cuenta en el armazón: "Cerrar sesión" con sesión, "Iniciar sesión" sin ella.
 * Mientras se comprueba la sesión no pinta nada, así el HTML del servidor (siempre sin
 * sesión conocida) coincide con el primer render del cliente.
 */
export function SessionMenu({ withLabel = false }: { withLabel?: boolean }) {
  const t = useTranslations("auth");
  const status = useAuthStore((state) => state.status);
  const signOutMutation = useSignOut();
  const classes = `flex h-11 items-center gap-3 rounded-2xl text-ink-2 hover:bg-surface-2 ${
    withLabel ? "px-3.5 text-[15px] font-semibold" : "w-11 justify-center"
  }`;

  if (status === "anonymous") {
    return (
      <Link
        href={SIGN_IN_PATH}
        className={withLabel ? classes : "px-2 text-sm font-bold text-primary-ink"}
      >
        {t("session.signIn")}
      </Link>
    );
  }
  if (status !== "authenticated") return null;

  const label = signOutMutation.isPending ? t("session.signingOut") : t("session.signOut");
  return (
    <button
      type="button"
      disabled={signOutMutation.isPending}
      onClick={() => signOutMutation.mutate()}
      aria-label={withLabel ? undefined : label}
      title={label}
      className={classes}
    >
      <LogoutIcon size={21} />
      {withLabel ? label : null}
    </button>
  );
}
