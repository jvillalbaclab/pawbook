"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { clearPrivatePageCaches } from "@/features/shell/service-worker";
import { session } from "@/lib/api-client/client";
import { useAuthStore } from "@/stores/auth";
import { onAuthBroadcast, restoreSession } from "./auth-api";

/**
 * Al cargar la app intenta recuperar la sesión con la cookie de refresh (el access token no
 * sobrevive a una recarga). También sigue lo que pasa en otras pestañas: si una cierra
 * sesión, esta la cierra y borra sus cachés; si una inicia sesión, esta la recupera.
 */
export function SessionBootstrap() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (useAuthStore.getState().status === "unknown") void restoreSession();
    return onAuthBroadcast((message) => {
      if (message === "signed-out") {
        session.clear();
        queryClient.clear();
        void clearPrivatePageCaches();
      } else if (!session.hasSession()) {
        void restoreSession();
      }
    });
  }, [queryClient]);

  return null;
}
