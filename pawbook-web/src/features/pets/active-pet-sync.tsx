"use client";

import { useEffect } from "react";
import { streamSession } from "@/lib/realtime/stream";
import { activePetStore, useActivePetStore } from "@/stores/active-pet";
import { useAuthStore } from "@/stores/auth";
import { useMyPetsQuery } from "./pets-api";

/**
 * Mantiene la mascota activa al día con la sesión: al recuperarla carga `GET /v1/me/pets` y la
 * vuelca en el store; al cerrarla, lo vacía. Cada cambio de mascota activa se pasa a la capa
 * de tiempo real, que pide tokens de Stream con su `X-Pet-Id` y reconecta Feeds.
 */
export function ActivePetSync() {
  const status = useAuthStore((state) => state.status);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const pets = useMyPetsQuery().data;
  const activePetId = useActivePetStore((state) => state.activePetId);

  useEffect(() => {
    const store = activePetStore.getState();
    // Sin sesión, o con otra cuenta (nunca se muestran las mascotas del usuario anterior).
    if (status === "anonymous" || (store.userId !== null && store.userId !== userId)) {
      store.reset();
    }
  }, [status, userId]);

  useEffect(() => {
    if (userId !== null && pets !== undefined) activePetStore.getState().hydrate(userId, pets);
  }, [userId, pets]);

  useEffect(() => {
    streamSession.setActivePet(activePetId);
  }, [activePetId]);

  return null;
}
