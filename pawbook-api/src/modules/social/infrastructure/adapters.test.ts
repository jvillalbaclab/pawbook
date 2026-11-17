import { describe, expect, test } from "bun:test";
import { jwtVerify } from "jose";
import { FakeRealtimeTokens, MemorySocialIdentity } from "./fake-stream";
import { StreamRealtimeTokens } from "./stream-realtime-tokens";

const SECRET = "secreto-de-la-app-de-stream-de-pruebas";
const ISSUED = new Date("2026-11-17T10:00:00Z");
const EXPIRES = new Date("2026-11-17T11:00:00Z");

describe("StreamRealtimeTokens (SDK oficial, sin red)", () => {
  test("firma un JWT HS256 con user_id, iat y exp que Stream puede validar", async () => {
    const tokens = new StreamRealtimeTokens("api-key", SECRET);
    const token = tokens.userToken("pet_abc", ISSUED, EXPIRES);
    const { payload, protectedHeader } = await jwtVerify(token, new TextEncoder().encode(SECRET), {
      currentDate: new Date("2026-11-17T10:30:00Z"),
    });
    expect(protectedHeader.alg).toBe("HS256");
    expect(payload).toMatchObject({
      user_id: "pet_abc",
      iat: ISSUED.getTime() / 1000,
      exp: EXPIRES.getTime() / 1000,
    });
    expect(tokens.apiKey).toBe("api-key");
  });

  test("otro secreto no valida el token", async () => {
    const token = new StreamRealtimeTokens("api-key", SECRET).userToken("usr_1", ISSUED, EXPIRES);
    await expect(
      jwtVerify(token, new TextEncoder().encode("otro-secreto-cualquiera-de-32-chars"), {
        currentDate: ISSUED,
      }),
    ).rejects.toThrow();
  });
});

describe("adaptadores falsos", () => {
  test("los tokens falsos se reconocen como tales", () => {
    expect(new FakeRealtimeTokens().userToken("pet_1", ISSUED, EXPIRES)).toBe(
      `fake.pet_1.${EXPIRES.getTime() / 1000}`,
    );
  });

  test("la identidad en memoria hace upsert y desactiva", async () => {
    const identities = new MemorySocialIdentity();
    const luna = { streamUserId: "pet_1", handle: "luna", name: "Luna", avatarMediaId: null };
    await identities.upsertPet(luna);
    await identities.upsertPet({ ...luna, name: "Luna II" });
    await identities.deactivatePet("pet_1");
    await identities.deactivatePet("pet_desconocida");
    expect([...identities.users.values()]).toEqual([{ ...luna, name: "Luna II", active: false }]);
  });
});
