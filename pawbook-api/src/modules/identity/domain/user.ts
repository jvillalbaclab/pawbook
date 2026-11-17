import type { Uuid } from "../../../shared/ids";

/*
 * Cuenta de usuario (FR-AUTH-001). El estado no se guarda aparte: se deriva de
 * `emailVerifiedAt`, así no puede haber una cuenta "activa" sin correo verificado.
 */

export type UserStatus = "pending_verification" | "active";

export type User = {
  readonly id: Uuid;
  /** Siempre normalizado con `normalizeEmail`. */
  readonly email: string;
  /** `null` en cuentas creadas con Google que aún no han fijado contraseña. */
  readonly passwordHash: string | null;
  /** Fecha de calendario `AAAA-MM-DD`. */
  readonly birthDate: string;
  readonly emailVerifiedAt: Date | null;
  readonly createdAt: Date;
};

export function userStatus(user: Pick<User, "emailVerifiedAt">): UserStatus {
  return user.emailVerifiedAt === null ? "pending_verification" : "active";
}

/**
 * Normaliza el correo para compararlo y guardarlo: sin espacios y en minúsculas. No se tocan
 * puntos ni sufijos `+etiqueta`: son buzones distintos para muchos proveedores.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
