import { SessionGate } from "@/features/auth/session-gate";

/**
 * Zona privada de la app (feed, PawMates, mensajes): exige sesión y, sin ella, lleva al login
 * con la ruta de vuelta. Los perfiles de mascota y las fichas de adopción quedan fuera de este
 * grupo porque son recursos públicos y compartibles (UI-001, arquitectura §6.2).
 */
export default function PrivateLayout({ children }: LayoutProps<"/">) {
  return <SessionGate>{children}</SessionGate>;
}
