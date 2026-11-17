/*
 * API pública del módulo identity para el resto de módulos (§4.2). Otros módulos reaccionan a
 * sus eventos; la autenticación de las rutas se hace con los middlewares transversales de
 * `src/http/middleware/auth.ts` (`requireAuth`, `requireVerifiedEmail`), no importando esto.
 */
export type { EmailVerified, RegistrationMethod, UserRegistered } from "./domain/events";
