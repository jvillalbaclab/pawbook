import { fixedClock } from "../../../../shared/clock";
import type { Uuid } from "../../../../shared/ids";
import type { PetSocialProfile } from "../../../pets/index";
import type {
  RealtimeTokenPort,
  SocialDeps,
  SocialIdentityPort,
  SocialPetIdentity,
} from "../ports";

/*
 * Dobles de prueba de social para los tests unitarios: herméticos, sin Stream ni Postgres.
 */

export class RecordingSocialIdentity implements SocialIdentityPort {
  readonly calls: (["upsert", SocialPetIdentity] | ["deactivate", string])[] = [];
  failNext = false;

  async upsertPet(identity: SocialPetIdentity): Promise<void> {
    this.#maybeFail();
    this.calls.push(["upsert", identity]);
  }

  async deactivatePet(streamUserId: string): Promise<void> {
    this.#maybeFail();
    this.calls.push(["deactivate", streamUserId]);
  }

  #maybeFail() {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("Stream no responde");
    }
  }
}

/** Tokens legibles `token(<usuario>,<iat>,<exp>)` para comprobar qué se firmó. */
export const readableTokens: RealtimeTokenPort = {
  apiKey: "test-api-key",
  userToken: (user, issuedAt, expiresAt) =>
    `token(${user},${issuedAt.toISOString()},${expiresAt.toISOString()})`,
};

export function createTestSocialDeps(
  overrides: { tokens?: RealtimeTokenPort | null } = {},
): SocialDeps & {
  identities: RecordingSocialIdentity;
  profiles: Map<string, PetSocialProfile>;
} {
  const profiles = new Map<string, PetSocialProfile>();
  return {
    tokens: overrides.tokens === undefined ? readableTokens : overrides.tokens,
    identities: new RecordingSocialIdentity(),
    profiles,
    petProfiles: async (petId: Uuid) => profiles.get(petId) ?? null,
    clock: fixedClock(new Date("2026-11-17T10:00:00Z")),
  };
}
