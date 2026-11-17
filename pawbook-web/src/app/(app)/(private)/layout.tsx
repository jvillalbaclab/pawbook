import { SessionGate } from "@/features/auth/session-gate";
import { ActivePetGate } from "@/features/pets/active-pet-gate";

/**
 * Zona privada de la app (feed, PawMates, mensajes): exige sesión y, sin ella, lleva al login
 * con la ruta de vuelta. Todo aquí se hace como la mascota activa, así que también exige
 * tener una (sin mascotas, al paso 2 del onboarding). Los perfiles de mascota y las fichas de
 * adopción quedan fuera de este grupo porque son recursos públicos y compartibles (UI-001,
 * arquitectura §6.2).
 */
export default function PrivateLayout({ children }: LayoutProps<"/">) {
  return (
    <SessionGate>
      <ActivePetGate>{children}</ActivePetGate>
    </SessionGate>
  );
}
