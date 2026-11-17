import type {
  RealtimeTokenPort,
  SocialIdentityPort,
  SocialPetIdentity,
} from "../application/ports";

/*
 * Adaptadores falsos de Stream para desarrollo y tests de integración mientras no exista la
 * cuenta de GetStream (T-F0.13, spike T-SP.*). No salen a la red.
 */

/**
 * Tokens reconocibles como falsos (`fake.<usuario>.<exp>`): sirven para recorrer los flujos de la
 * web en local, pero Stream los rechazaría. Nunca se usan en producción (ver la composición).
 */
export class FakeRealtimeTokens implements RealtimeTokenPort {
  readonly apiKey = "fake-stream-api-key";

  userToken(streamUserId: string, _issuedAt: Date, expiresAt: Date): string {
    return `fake.${streamUserId}.${Math.floor(expiresAt.getTime() / 1000)}`;
  }
}

/**
 * Usuarios de Stream en memoria. Es el adaptador de identidad en todos los entornos hasta que el
 * spike valide el SDK de Feeds v3: entonces se añade `StreamSocialIdentity` y la composición lo
 * elige cuando haya credenciales.
 */
export class MemorySocialIdentity implements SocialIdentityPort {
  readonly users = new Map<string, SocialPetIdentity & { active: boolean }>();

  async upsertPet(identity: SocialPetIdentity): Promise<void> {
    this.users.set(identity.streamUserId, { ...identity, active: true });
  }

  async deactivatePet(streamUserId: string): Promise<void> {
    const current = this.users.get(streamUserId);
    if (current !== undefined) this.users.set(streamUserId, { ...current, active: false });
  }
}
