import { SessionGate } from "@/features/auth/session-gate";

/**
 * Onboarding tras el registro (presentar la mascota y elegir a quién seguir): exige sesión,
 * pero no el correo verificado. Crear la mascota propia no es una acción social; FR-AUTH-006
 * solo bloquea publicar, comentar, seguir y chatear. El aviso de verificar va en el paso 3.
 */
export default function OnboardingLayout({ children }: LayoutProps<"/registro">) {
  return <SessionGate fallbackClassName="mx-auto max-w-[440px] px-5">{children}</SessionGate>;
}
