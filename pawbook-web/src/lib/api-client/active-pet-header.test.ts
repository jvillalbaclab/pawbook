import { describe, expect, test } from "bun:test";
import { createActivePetFetch, requiresActivePet } from "./active-pet-header";
import { createApiClient } from "./client";
import { createSessionController } from "./session";

/* Inyección de `X-Pet-Id`: solo en las rutas que actúan como la mascota activa. */

const API = "https://api.pawbook.test";
const PET = "11111111-1111-7111-8111-111111111111";
const OTHER = "22222222-2222-7222-8222-222222222222";

function recorder() {
  const seen: { path: string; petId: string | null }[] = [];
  const fetchImpl = async (request: Request) => {
    seen.push({ path: new URL(request.url).pathname, petId: request.headers.get("X-Pet-Id") });
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  };
  return { seen, fetchImpl };
}

describe("rutas que llevan X-Pet-Id", () => {
  test("los tokens de Stream sí; auth y las lecturas de mascotas propias no", () => {
    expect(requiresActivePet("POST", "/v1/stream/token")).toBe(true);
    expect(requiresActivePet("post", "/v1/stream/token")).toBe(true);
    expect(requiresActivePet("GET", "/v1/stream/token")).toBe(false);
    expect(requiresActivePet("POST", "/v1/auth/sign-in")).toBe(false);
    expect(requiresActivePet("POST", "/v1/auth/refresh")).toBe(false);
    expect(requiresActivePet("GET", "/v1/me/pets")).toBe(false);
    expect(requiresActivePet("POST", "/v1/pets")).toBe(false);
  });
});

describe("createActivePetFetch", () => {
  test("añade la mascota activa en el momento de enviar", async () => {
    const { seen, fetchImpl } = recorder();
    let active: string | null = PET;
    const petFetch = createActivePetFetch(() => active, fetchImpl);
    await petFetch(new Request(`${API}/v1/stream/token`, { method: "POST" }));
    active = OTHER;
    await petFetch(new Request(`${API}/v1/stream/token`, { method: "POST" }));
    expect(seen.map((call) => call.petId)).toEqual([PET, OTHER]);
  });

  test("no la añade a auth ni a rutas que no la usan", async () => {
    const { seen, fetchImpl } = recorder();
    const petFetch = createActivePetFetch(() => PET, fetchImpl);
    await petFetch(new Request(`${API}/v1/auth/sign-in`, { method: "POST", body: "{}" }));
    await petFetch(new Request(`${API}/v1/me/pets`));
    await petFetch(new Request(`${API}/v1/pets/handles/luna/availability`));
    expect(seen.map((call) => call.petId)).toEqual([null, null, null]);
  });

  test("respeta una X-Pet-Id explícita (la de la capa de tiempo real)", async () => {
    const { seen, fetchImpl } = recorder();
    const petFetch = createActivePetFetch(() => OTHER, fetchImpl);
    await petFetch(
      new Request(`${API}/v1/stream/token`, { method: "POST", headers: { "x-pet-id": PET } }),
    );
    expect(seen[0].petId).toBe(PET);
  });

  test("sin mascota activa no inventa ninguna", async () => {
    const { seen, fetchImpl } = recorder();
    await createActivePetFetch(
      () => null,
      fetchImpl,
    )(new Request(`${API}/v1/stream/token`, { method: "POST" }));
    expect(seen[0].petId).toBeNull();
  });
});

test("el cliente tipado la envía junto al Bearer", async () => {
  const headers: Record<string, string | null>[] = [];
  const api = createApiClient({
    baseUrl: API,
    session: createSessionController({ refreshRequest: async () => null }),
    activePetId: () => PET,
    fetch: async (request) => {
      headers.push({
        petId: request.headers.get("X-Pet-Id"),
        idempotency: request.headers.get("Idempotency-Key"),
      });
      return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });
  await api.POST("/v1/stream/token", { params: { header: { "x-pet-id": PET } } });
  await api.GET("/v1/me/pets");
  expect(headers).toEqual([
    { petId: PET, idempotency: null },
    { petId: null, idempotency: null },
  ]);
});
