import type { Clock } from "../../../shared/clock";
import { type DomainEvent, domainEvent } from "../../../shared/events";
import type { Uuid } from "../../../shared/ids";

/*
 * Eventos de identity. El payload no lleva el correo ni la fecha de nacimiento: el outbox se
 * conserva y se registra, y quien necesite datos de la cuenta los pide por la API del módulo.
 */

export type RegistrationMethod = "password" | "google";

export type UserRegistered = DomainEvent<
  "identity.user-registered",
  { userId: string; method: RegistrationMethod }
>;

export type EmailVerified = DomainEvent<"identity.email-verified", { userId: string }>;

export const userRegistered = (userId: Uuid, method: RegistrationMethod, clock: Clock) =>
  domainEvent("identity.user-registered", { userId, method }, clock);

export const emailVerified = (userId: Uuid, clock: Clock) =>
  domainEvent("identity.email-verified", { userId }, clock);
