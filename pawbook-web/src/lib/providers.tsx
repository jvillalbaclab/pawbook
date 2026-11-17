"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { SessionBootstrap } from "@/features/auth/session-bootstrap";
import { ActivePetSync } from "@/features/pets/active-pet-sync";
import { BrowserTimeZoneProvider } from "@/i18n/browser-time-zone";
import { isApiError } from "./api-client/problem";

/** Reintentos de TanStack Query: solo fallos de red o del servidor, nunca un 4xx. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  return !isApiError(error) || error.status === 0 || error.status >= 500;
}

export function Providers({ children }: { children: ReactNode }) {
  // Un QueryClient por sesión de navegador; useState evita recrearlo en cada render.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: shouldRetry } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserTimeZoneProvider>
        <SessionBootstrap />
        <ActivePetSync />
        {children}
      </BrowserTimeZoneProvider>
    </QueryClientProvider>
  );
}
