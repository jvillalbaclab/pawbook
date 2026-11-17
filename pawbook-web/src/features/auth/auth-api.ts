import type { GoogleSignInRequest, Me, SignUpRequest } from "@pawbook/contracts";
import { api, session, unwrap } from "@/lib/api-client/client";
import { isApiError } from "@/lib/api-client/problem";

/*
 * Operaciones de identidad contra `/v1/auth/*` (FR-AUTH-001 a 005). La web pide siempre el
 * refresh token en cookie (`refreshTokenDelivery: "cookie"`): el cuerpo trae
 * `refreshToken: null` y el access token se guarda solo en memoria (ver session.ts).
 */

/** Versión de términos vigente que se acepta al registrarse (OR-LEG-001). */
export const TERMS_VERSION = process.env.NEXT_PUBLIC_TERMS_VERSION ?? "2026-11-17";

/** Edad mínima de registro (PROVISIONAL, T-F0.02); la que manda es la de la API. */
export const MIN_SIGNUP_AGE = Number(process.env.NEXT_PUBLIC_MIN_SIGNUP_AGE ?? 18);

// --------------------------------------------------------------------- entre pestañas

/*
 * Avisa a las demás pestañas de que se inició o se cerró sesión. Así, cerrar sesión en una
 * pestaña la cierra en todas, y una pestaña sin sesión la recupera cuando otra entra.
 */
type AuthBroadcast = "signed-in" | "signed-out";
const CHANNEL_NAME = "pawbook-auth";

function broadcast(message: AuthBroadcast): void {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage(message);
  channel.close();
}

/** Escucha los avisos de otras pestañas. Devuelve la función para dejar de escuchar. */
export function onAuthBroadcast(listener: (message: AuthBroadcast) => void): () => void {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<unknown>) => {
    if (event.data === "signed-in" || event.data === "signed-out") listener(event.data);
  };
  return () => channel.close();
}

// ------------------------------------------------------------------------- sesión

/**
 * Recupera la sesión al cargar la app con la cookie de refresh. Sin cookie o con la sesión
 * revocada, queda sin sesión. Sin red tampoco hay sesión: la interfaz no puede confirmarla.
 */
export async function restoreSession(): Promise<void> {
  try {
    await session.refresh();
  } catch {
    session.clear();
  }
}

export async function signIn(credentials: { email: string; password: string }): Promise<Me> {
  const issued = await unwrap(
    api.POST("/v1/auth/sign-in", {
      body: { ...credentials, refreshTokenDelivery: "cookie" },
    }),
  );
  session.set(issued);
  broadcast("signed-in");
  return issued.user;
}

export async function googleSignIn(
  input: Omit<GoogleSignInRequest, "refreshTokenDelivery">,
): Promise<{ user: Me; isNewUser: boolean }> {
  const issued = await unwrap(
    api.POST("/v1/auth/google", { body: { ...input, refreshTokenDelivery: "cookie" } }),
  );
  session.set(issued);
  broadcast("signed-in");
  return { user: issued.user, isNewUser: issued.isNewUser };
}

/**
 * Registro. La API responde 202 igual exista o no el correo (sin enumeración de cuentas) y
 * el cliente continúa con el login. Si el login falla (p. ej. el correo ya tenía cuenta con
 * otra contraseña), se sigue sin sesión y la pantalla siguiente es la misma.
 */
export async function signUp(request: SignUpRequest): Promise<Me | null> {
  await unwrap(api.POST("/v1/auth/sign-up", { body: request }));
  try {
    return await signIn({ email: request.email, password: request.password });
  } catch (error) {
    if (isApiError(error) && error.code === "unauthorized") return null;
    throw error;
  }
}

/** Cierra la sesión en la API (borra la cookie) y en esta pestaña. Nunca falla. */
export async function signOut(): Promise<void> {
  try {
    await unwrap(api.POST("/v1/auth/sign-out"));
  } catch {
    // Sin red o con la API caída, la sesión se cierra igual en el navegador; el refresh
    // token caduca solo y ya no hay access token en memoria.
  }
  session.clear();
  broadcast("signed-out");
}

// ------------------------------------------------------------ correo y contraseña

/**
 * Verifica el correo con el token del enlace. Si hay sesión, la renueva para que el nuevo
 * access token lleve `ev: true` (FR-AUTH-006) y el usuario aparezca como verificado.
 */
export async function verifyEmail(token: string): Promise<void> {
  await unwrap(api.POST("/v1/auth/verify-email", { body: { token } }));
  // Si la sesión se está recuperando al cargar la página, se espera a que termine.
  await session.ensureFreshToken().catch(() => null);
  if (session.hasSession()) await session.refresh();
}

/** Reenvía el enlace de verificación al usuario de la sesión. */
export async function resendVerification(): Promise<void> {
  await unwrap(api.POST("/v1/auth/verify-email/resend"));
}

/** Renueva la sesión para leer el estado actual del correo (p. ej. verificado en otro dispositivo). */
export async function reloadUser(): Promise<Me | null> {
  await session.refresh();
  return session.user();
}

export async function requestPasswordReset(email: string): Promise<void> {
  await unwrap(api.POST("/v1/auth/password/forgot", { body: { email } }));
}

/** Cambia la contraseña con el token del enlace. La API cierra todas las sesiones de la cuenta. */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await unwrap(api.POST("/v1/auth/password/reset", { body: { token, newPassword } }));
  if (session.hasSession()) session.clear();
}
