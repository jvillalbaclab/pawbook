"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";
import { useActivePetStore } from "@/stores/active-pet";

export function Providers({ children }: { children: ReactNode }) {
  // Un QueryClient por sesión de navegador; useState evita recrearlo en cada render.
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }),
  );

  useEffect(() => {
    void useActivePetStore.persist.rehydrate();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
