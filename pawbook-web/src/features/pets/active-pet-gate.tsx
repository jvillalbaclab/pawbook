"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect } from "react";
import { PawIcon } from "@/design-system/icons";
import { ErrorState, LoadingState, Skeleton } from "@/design-system/states";
import { ONBOARDING_START_PATH } from "@/features/auth/guards";
import { useActivePetStore } from "@/stores/active-pet";
import { useMyPetsQuery } from "./pets-api";

/**
 * Pantallas privadas que actúan como una mascota (feed, PawMates, mensajes): esperan a que se
 * conozca la mascota activa. Un usuario sin mascotas va al paso 2 del onboarding a crearla.
 * Va dentro de SessionGate, así que aquí ya hay sesión.
 */
export function ActivePetGate({ children }: { children: ReactNode }) {
  const t = useTranslations("pets");
  const router = useRouter();
  const query = useMyPetsQuery();
  const ready = useActivePetStore((state) => state.status === "ready");
  const hasActivePet = useActivePetStore((state) => state.activePetId !== null);
  const needsPet = ready && !hasActivePet;

  useEffect(() => {
    if (needsPet) router.replace(ONBOARDING_START_PATH);
  }, [needsPet, router]);

  if (ready && hasActivePet) return children;
  if (query.isError && !ready) {
    return (
      <ErrorState
        icon={<PawIcon size={40} />}
        title={t("loadError")}
        onRetry={() => void query.refetch()}
      />
    );
  }
  return (
    <LoadingState label={t("loading")} className="flex flex-col gap-3 py-8">
      <Skeleton className="h-6 w-1/3 rounded-full" />
      <Skeleton className="h-40 w-full rounded-card" />
    </LoadingState>
  );
}
