/*
 * Identidad en GetStream (ADR-002, arquitectura §3.1). Feeds: la mascota es el actor (reacciones
 * y seguidores por mascota), usuario `pet_<petId>`. Chat: hablan las personas responsables,
 * usuario `usr_<userId>`. La correspondencia vive aquí y no en cada adaptador: es una decisión de
 * negocio, y cambiar de proveedor (ADR-003) no debe cambiarla.
 */

export const feedsUserId = (petId: string): string => `pet_${petId}`;
export const chatUserId = (userId: string): string => `usr_${userId}`;

/** FR-AUTH-010 pide ≤ 24 h. Una hora acota el daño de un token filtrado; el SDK lo renueva. */
export const STREAM_TOKEN_TTL_MS = 60 * 60 * 1000;
