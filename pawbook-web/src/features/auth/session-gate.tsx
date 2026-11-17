"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect } from "react";
import { LoadingState, Skeleton } from "@/design-system/states";
import { useAuthStore } from "@/stores/auth";
import { type AccessRequirement, decideAccess } from "./guards";

/**
 * Protege una zona en el cliente. Mientras la sesión se comprueba (refresh al cargar) o se
 * redirige, pinta un estado de carga; con acceso, el contenido.
 *
 * Va en cliente y no en middleware a propósito: el access token solo existe en memoria del
 * navegador y la cookie de refresh es de la API (Path=/v1/auth), así que el servidor de Next
 * no puede saber si hay sesión. Además, las páginas siguen siendo estáticas: la guarda no lee
 * cabeceras ni cookies y no rompe el prerenderizado.
 */
export function SessionGate({
  requirement = "session",
  fallbackClassName = "",
  children,
}: {
  requirement?: AccessRequirement;
  /** Clases del contenedor del estado de carga (márgenes de la zona protegida). */
  fallbackClassName?: string;
  children: ReactNode;
}) {
  const t = useTranslations("auth");
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  // La ruta actual solo hace falta para volver tras el login; se lee al redirigir.
  const decision = decideAccess({ status, user }, requirement, "/");
  const redirectKind = decision.kind === "redirect" ? decision.to : null;

  useEffect(() => {
    if (redirectKind === null) return;
    const here = `${window.location.pathname}${window.location.search}`;
    const target = decideAccess({ status, user }, requirement, here);
    if (target.kind === "redirect") router.replace(target.to);
  }, [redirectKind, status, user, requirement, router]);

  if (decision.kind === "allow") return children;
  return (
    <LoadingState
      label={t("session.checking")}
      className={`flex flex-col gap-3 py-8 ${fallbackClassName}`}
    >
      <Skeleton className="h-6 w-1/3 rounded-full" />
      <Skeleton className="h-40 w-full rounded-card" />
      <Skeleton className="h-4 w-2/3 rounded-full" />
    </LoadingState>
  );
}
