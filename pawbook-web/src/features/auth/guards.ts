import type { Me } from "@pawbook/contracts";
import type { AuthStatus } from "@/stores/auth";

/*
 * Decisiones de acceso de las rutas protegidas, sin React para poder probarlas solas.
 * La protección es de interfaz: los datos privados solo llegan con el access token, que el
 * servidor de Next nunca tiene, así que el HTML prerenderizado no contiene nada privado.
 */

export const SIGN_IN_PATH = "/entrar";
export const CHECK_EMAIL_PATH = "/registro/revisa-tu-correo";
export const ONBOARDING_START_PATH = "/registro/mascota";
export const RETURN_PARAM = "volver";

export type AccessRequirement = "session" | "verified-email";

export type AccessDecision =
  | { kind: "wait" }
  | { kind: "allow" }
  | { kind: "redirect"; to: string };

export function decideAccess(
  state: { status: AuthStatus; user: Me | null },
  requirement: AccessRequirement,
  currentPath: string,
): AccessDecision {
  if (state.status === "unknown") return { kind: "wait" };
  if (state.status === "anonymous" || state.user === null) {
    return { kind: "redirect", to: signInUrl(currentPath) };
  }
  if (requirement === "verified-email" && !state.user.emailVerified) {
    return { kind: "redirect", to: CHECK_EMAIL_PATH };
  }
  return { kind: "allow" };
}

/** `/entrar?volver=/mensajes/kira` (sin `volver` si la vuelta es al inicio). */
export function signInUrl(returnTo: string): string {
  const safe = safeReturnPath(returnTo);
  return safe === "/"
    ? SIGN_IN_PATH
    : `${SIGN_IN_PATH}?${new URLSearchParams({ [RETURN_PARAM]: safe })}`;
}

/**
 * Ruta de vuelta tras el login, solo si es interna: empieza por una sola "/" (nada de
 * `//otro.sitio`, `/\otro.sitio` ni URLs absolutas), para no abrir una redirección a terceros.
 */
export function safeReturnPath(value: string | null | undefined, fallback = "/"): string {
  if (!value?.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}

/** Ruta de vuelta leída de la query de la página actual (`?volver=`). */
export function returnPathFromSearch(search: string): string {
  return safeReturnPath(new URLSearchParams(search).get(RETURN_PARAM));
}
