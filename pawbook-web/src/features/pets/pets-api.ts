import type { Pet } from "@pawbook/contracts";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api-client/client";
import { useAuthStore } from "@/stores/auth";

/* Operaciones de mascotas propias contra `/v1/me/pets` y `/v1/pets/*` (FR-PET-001/002). */

/** Clave de la lista de mascotas propias; incluye el usuario para no mezclar cuentas. */
export const myPetsQueryKey = (userId: string | null) => ["me", "pets", userId] as const;

export async function fetchMyPets(): Promise<Pet[]> {
  const { items } = await unwrap(api.GET("/v1/me/pets"));
  return items;
}

/** Mascotas activas del usuario de la sesión (para el selector y la mascota activa). */
export function useMyPetsQuery() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  return useQuery({
    queryKey: myPetsQueryKey(userId),
    queryFn: fetchMyPets,
    enabled: userId !== null,
  });
}
