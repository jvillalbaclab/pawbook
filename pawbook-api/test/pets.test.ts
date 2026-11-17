import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  setDefaultTimeout,
  test,
} from "bun:test";
import {
  AuthSessionSchema,
  CaretakerProfileSchema,
  HandleAvailabilitySchema,
  MyPetsSchema,
  PetSchema,
  ProblemSchema,
  PublicPetSchema,
  StreamTokenResponseSchema,
} from "@pawbook/contracts";
import Redis from "ioredis";
import { PgBoss } from "pg-boss";
import pino from "pino";
import { loadConfig } from "../src/composition/config";
import { createIdentityModule } from "../src/composition/identity";
import { createPetsModule } from "../src/composition/pets";
import { createSocialModule } from "../src/composition/social";
import { createApp } from "../src/http/app";
import { ValkeyIdempotencyStore } from "../src/http/idempotency/valkey-store";
import { ValkeyRateLimitStore } from "../src/http/rate-limit/valkey-store";
import { DrizzleUnitOfWork } from "../src/infrastructure/db/database";
import { DrizzleEventOutbox } from "../src/infrastructure/db/outbox";
import { MemoryEmailSender } from "../src/infrastructure/email/email-senders";
import { registerEventHandlers } from "../src/infrastructure/events/event-handlers";
import { OutboxRelay } from "../src/infrastructure/events/outbox-relay";
import type { PasswordHasher } from "../src/modules/identity/application/ports";
import { StaticBreachedPasswordChecker } from "../src/modules/identity/infrastructure/hibp-breached-password-checker";
import { HANDLE_CHANGE_COOLDOWN_MS } from "../src/modules/pets/domain/handle";
import { ValkeyPetOwnershipCache } from "../src/modules/pets/infrastructure/valkey-ownership-cache";
import { petIdentityHandlers } from "../src/modules/social/application/pet-identity-sync";
import { MemorySocialIdentity } from "../src/modules/social/infrastructure/fake-stream";
import { fixedClock } from "../src/shared/clock";
import { setupTestDatabase, type TestDatabase } from "./support/database";

/*
 * Integración de pets y de los tokens de Stream contra el Postgres y el Valkey locales
 * (`bun run db:up`): BD propia `pawbook_test_pets` y claves Valkey con prefijo `test:pets:`. Los
 * usuarios se crean con los endpoints reales de identity (registro → enlace → login). Stream usa
 * los adaptadores falsos: no hay cuenta de GetStream todavía.
 */
const PREFIX = "test:pets:";
const TERMS_VERSION = "2026-11-17";
const PASSWORD = "una frase larga y propia";

setDefaultTimeout(30_000);

let database: TestDatabase;
const redis = new Redis(process.env.VALKEY_URL ?? "redis://localhost:6380", {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
});
const mail = new MemoryEmailSender();
const ownershipCache = new ValkeyPetOwnershipCache(redis, { prefix: `${PREFIX}owner:` });
const petsClock = fixedClock(new Date("2026-11-17T10:00:00Z"));
const identities = new MemorySocialIdentity();

/** Argon2id real es lento y aquí no aporta nada: lo prueba la suite de identity. */
const plainHasher: PasswordHasher = {
  hash: async (password) => `plain:${password}`,
  verify: async (hash, password) => hash === `plain:${password}`,
};

async function deleteTestKeys() {
  let cursor = "0";
  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", `${PREFIX}*`, "COUNT", 500);
    if (keys.length > 0) await redis.del(...keys);
    cursor = next;
  } while (cursor !== "0");
}

function buildApp() {
  const config = loadConfig({
    NODE_ENV: "test",
    DATABASE_URL: database.url,
    VALKEY_URL: process.env.VALKEY_URL ?? "redis://localhost:6380",
    AUTH_ACCESS_TOKEN_SECRET: "secreto-de-tests-de-integracion-con-32-caracteres",
    TERMS_VERSION,
    EMAIL_TRANSPORT: "memory",
    PASSWORD_BREACH_CHECK: "off",
  });
  const logger = pino({ level: "silent" });
  const unitOfWork = new DrizzleUnitOfWork(database.db);
  const outbox = new DrizzleEventOutbox();
  const rateLimitStore = new ValkeyRateLimitStore(redis, `${PREFIX}rl:`);
  const idempotencyStore = new ValkeyIdempotencyStore(redis, `${PREFIX}idem:`);
  const identity = createIdentityModule({
    config,
    logger,
    unitOfWork,
    outbox,
    rateLimitStore,
    idempotencyStore,
    overrides: {
      email: mail,
      google: null,
      breachedPasswords: new StaticBreachedPasswordChecker(),
      passwordHasher: plainHasher,
      uniformResponseMs: 0,
    },
  });
  const pets = createPetsModule({
    logger,
    unitOfWork,
    outbox,
    valkey: redis,
    idempotencyStore,
    overrides: { clock: petsClock, ownershipCache },
  });
  const social = createSocialModule({
    config,
    logger,
    petProfiles: pets.petSocialProfile,
    activePet: pets.activePet,
    overrides: { identities },
  });
  const app = createApp({
    logger,
    version: "test",
    corsOrigins: [],
    readinessChecks: [],
    // Cada usuario usa su propia IP (X-Forwarded-For) para no compartir el límite de auth.
    trustedProxyHops: 1,
    rateLimitStore,
    idempotencyStore,
    accessTokenVerifier: identity.accessTokenVerifier,
    moduleRoutes: [identity.routes, pets.routes, social.routes],
  });
  return { app, social };
}

let built: ReturnType<typeof buildApp>;

beforeAll(async () => {
  database = await setupTestDatabase("pawbook_test_pets");
  await redis.connect();
  built = buildApp();
});

afterAll(async () => {
  await deleteTestKeys();
  await redis.quit();
  await database.close();
});

beforeEach(async () => {
  await database.sql`truncate identity.users cascade`;
  await database.sql`truncate pets.pets, pets.caretakers, platform.outbox`;
  await deleteTestKeys();
  mail.sent.length = 0;
  identities.users.clear();
});

type Json = Record<string, unknown>;

const randomIp = () =>
  `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

function call(
  method: string,
  path: string,
  options: { body?: Json; token?: string; headers?: Record<string, string>; ip?: string } = {},
) {
  const headers: Record<string, string> = {
    "X-Forwarded-For": options.ip ?? randomIp(),
    ...options.headers,
  };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token !== undefined) headers.Authorization = `Bearer ${options.token}`;
  return built.app.request(path, {
    method,
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
}

type TestUser = { id: string; token: string };

/** Registro con correo, verificación con el enlace del correo e inicio de sesión. */
async function registeredUser(email: string, options: { verified: boolean }): Promise<TestUser> {
  const ip = randomIp();
  const signUp = await call("POST", "/v1/auth/sign-up", {
    ip,
    body: { email, password: PASSWORD, birthDate: "1995-04-23", termsVersion: TERMS_VERSION },
  });
  expect(signUp.status).toBe(202);
  if (options.verified) {
    const text = mail.lastTo(email, "identity.verify-email")?.text ?? "";
    const token = /#token=([A-Za-z0-9_-]+)/.exec(text)?.[1];
    if (token === undefined) throw new Error(`Sin enlace de verificación para ${email}`);
    expect((await call("POST", "/v1/auth/verify-email", { ip, body: { token } })).status).toBe(200);
  }
  const signIn = await call("POST", "/v1/auth/sign-in", {
    ip,
    body: { email, password: PASSWORD },
  });
  expect(signIn.status).toBe(200);
  const session = AuthSessionSchema.parse(await signIn.json());
  return { id: session.user.id, token: session.accessToken };
}

const petBody = (handle: string, overrides: Json = {}) => ({
  handle,
  name: "Luna",
  species: "cat",
  sex: "female",
  ...overrides,
});

async function createPet(user: TestUser, handle: string, overrides: Json = {}) {
  const res = await call("POST", "/v1/pets", {
    token: user.token,
    body: petBody(handle, overrides),
  });
  expect(res.status).toBe(201);
  return PetSchema.parse(await res.json());
}

describe("flujo completo de mascotas", () => {
  test("crear, listar, perfil público con responsable, editar y archivar", async () => {
    const ana = await registeredUser("ana@example.com", { verified: true });

    const availability = await call("GET", "/v1/pets/handles/@Luna.Gato/availability", {
      token: ana.token,
    });
    expect(HandleAvailabilitySchema.parse(await availability.json())).toEqual({
      handle: "luna.gato",
      available: true,
      reason: null,
    });

    const pet = await createPet(ana, "@Luna.Gato", {
      breed: "Europeo común",
      birthMonth: "2023-05",
      bio: "Reina del sofá",
    });
    expect(pet).toMatchObject({
      handle: "luna.gato",
      status: "active",
      birthMonth: "2023-05",
      handleChangedAt: null,
      nextHandleChangeAt: null,
    });

    const mine = MyPetsSchema.parse(
      await (await call("GET", "/v1/me/pets", { token: ana.token })).json(),
    );
    expect(mine.items.map((item) => item.id)).toEqual([pet.id]);

    // FR-PET-008: sin nombre todavía no hay responsable visible; con nombre, sí.
    const caretaker = await call("PATCH", "/v1/me/caretaker-profile", {
      token: ana.token,
      body: { firstName: "Laura" },
    });
    expect(CaretakerProfileSchema.parse(await caretaker.json())).toEqual({
      firstName: "Laura",
      showFirstName: true,
    });

    // Perfil público sin sesión y sin distinguir mayúsculas.
    const publicRes = await call("GET", "/v1/pets/Luna.Gato");
    expect(publicRes.status).toBe(200);
    const publicPet = PublicPetSchema.parse(await publicRes.json());
    expect(publicPet).toMatchObject({ id: pet.id, caretaker: { firstName: "Laura" } });
    expect(JSON.stringify(publicPet)).not.toContain("ana@example.com");

    await call("PATCH", "/v1/me/caretaker-profile", {
      token: ana.token,
      body: { showFirstName: false },
    });
    const hidden = PublicPetSchema.parse(await (await call("GET", "/v1/pets/luna.gato")).json());
    expect(hidden.caretaker).toBeNull();

    const edited = await call("PATCH", `/v1/pets/${pet.id}`, {
      token: ana.token,
      body: { bio: null, favoriteToy: "Ratón de lana" },
    });
    expect(edited.status).toBe(200);
    expect(PetSchema.parse(await edited.json())).toMatchObject({
      bio: null,
      favoriteToy: "Ratón de lana",
    });

    const archived = await call("POST", `/v1/pets/${pet.id}/archive`, { token: ana.token });
    expect(archived.status).toBe(204);
    expect((await call("GET", "/v1/pets/luna.gato")).status).toBe(404);
    const afterArchive = MyPetsSchema.parse(
      await (await call("GET", "/v1/me/pets", { token: ana.token })).json(),
    );
    expect(afterArchive.items).toEqual([]);

    const events = await database.sql`
      select event_type, payload from platform.outbox
      where event_type like 'pets.%' order by id`;
    expect(events.map((row) => row.event_type)).toEqual([
      "pets.pet-created",
      "pets.pet-updated",
      "pets.pet-archived",
    ]);
    expect(events[0]?.payload).toEqual({ petId: pet.id, ownerId: ana.id });
    expect(events[1]?.payload).toEqual({
      petId: pet.id,
      ownerId: ana.id,
      fields: ["bio", "favoriteToy"],
    });
    // Sin datos personales ni del perfil en el outbox (NFR-OBS-002).
    const serialized = JSON.stringify(events);
    for (const secret of ["ana@example.com", "Laura", "Luna", "Ratón"]) {
      expect(serialized).not.toContain(secret);
    }
  });

  test("crear o editar exige correo verificado; leer un perfil no exige sesión", async () => {
    const pending = await registeredUser("pendiente@example.com", { verified: false });
    const res = await call("POST", "/v1/pets", { token: pending.token, body: petBody("luna") });
    expect(res.status).toBe(403);
    expect(ProblemSchema.parse(await res.json()).type).toBe(
      "https://pawbook.app/problems/email-not-verified",
    );
    expect((await call("POST", "/v1/pets", { body: petBody("luna") })).status).toBe(401);
    expect((await call("GET", "/v1/pets/nadie")).status).toBe(404);
  });

  test("editar o archivar la mascota de otro responde 404", async () => {
    const ana = await registeredUser("ana@example.com", { verified: true });
    const bruno = await registeredUser("bruno@example.com", { verified: true });
    const pet = await createPet(ana, "luna");
    const edit = await call("PATCH", `/v1/pets/${pet.id}`, {
      token: bruno.token,
      body: { name: "Robada" },
    });
    expect(edit.status).toBe(404);
    expect((await call("POST", `/v1/pets/${pet.id}/archive`, { token: bruno.token })).status).toBe(
      404,
    );
  });
});

describe("@handle (FR-PET-002)", () => {
  test("duplicado con distinta capitalización ⇒ 409", async () => {
    const ana = await registeredUser("ana@example.com", { verified: true });
    const bruno = await registeredUser("bruno@example.com", { verified: true });
    await createPet(ana, "luna.gato");

    const res = await call("POST", "/v1/pets", { token: bruno.token, body: petBody("LUNA.Gato") });
    expect(res.status).toBe(409);
    expect(ProblemSchema.parse(await res.json()).errors?.[0]?.path).toBe("handle");

    const availability = await call("GET", "/v1/pets/handles/LUNA.GATO/availability", {
      token: bruno.token,
    });
    expect(HandleAvailabilitySchema.parse(await availability.json()).reason).toBe("taken");
  });

  test("Postgres protege el handle: índice único sobre lower(handle) y CHECK de formato", async () => {
    const ana = await registeredUser("ana@example.com", { verified: true });
    const pet = await createPet(ana, "luna");
    // Aunque alguien se saltara el dominio, la base de datos no admite el duplicado.
    // Las consultas de postgres.js son perezosas: se ejecutan al hacer `await` (no con `expect`).
    const duplicate = (async () => database.sql`
      insert into pets.pets (id, owner_id, handle, name, species, sex, created_at, updated_at)
      values (gen_random_uuid(), ${ana.id}, 'luna', 'Otra', 'dog', 'male', now(), now())`)();
    await expect(duplicate).rejects.toThrow(/pets_handle_lower_key/);
    // Y el formato (solo minúsculas) lo vigila un CHECK.
    const upper = (async () =>
      database.sql`update pets.pets set handle = 'LUNA' where id = ${pet.id}`)();
    await expect(upper).rejects.toThrow(/pets_handle_format/);
  });

  test("dos altas simultáneas con el mismo handle: una gana y la otra recibe 409", async () => {
    const ana = await registeredUser("ana@example.com", { verified: true });
    const bruno = await registeredUser("bruno@example.com", { verified: true });
    const responses = await Promise.all([
      call("POST", "/v1/pets", { token: ana.token, body: petBody("rocco") }),
      call("POST", "/v1/pets", { token: bruno.token, body: petBody("Rocco") }),
    ]);
    expect(responses.map((res) => res.status).sort()).toEqual([201, 409]);
  });

  test("segundo cambio antes de 30 días ⇒ 409; pasado el plazo se permite", async () => {
    const ana = await registeredUser("ana@example.com", { verified: true });
    const pet = await createPet(ana, "luna");

    const first = await call("PATCH", `/v1/pets/${pet.id}`, {
      token: ana.token,
      body: { handle: "luna.gata" },
    });
    expect(first.status).toBe(200);
    const afterFirst = PetSchema.parse(await first.json());
    expect(afterFirst.nextHandleChangeAt).toBe(
      new Date(petsClock.now().getTime() + HANDLE_CHANGE_COOLDOWN_MS).toISOString(),
    );

    petsClock.advance(HANDLE_CHANGE_COOLDOWN_MS - 60_000);
    const second = await call("PATCH", `/v1/pets/${pet.id}`, {
      token: ana.token,
      body: { handle: "luna.reina" },
    });
    expect(second.status).toBe(409);
    expect(ProblemSchema.parse(await second.json()).detail).toContain("30 días");

    petsClock.advance(60_000);
    const third = await call("PATCH", `/v1/pets/${pet.id}`, {
      token: ana.token,
      body: { handle: "luna.reina" },
    });
    expect(third.status).toBe(200);
    expect((await call("GET", "/v1/pets/luna.reina")).status).toBe(200);
    // El handle anterior queda libre: el SRS no pide retenerlo.
    expect((await call("GET", "/v1/pets/luna.gata")).status).toBe(404);
  });

  test("handles reservados o con formato inválido ⇒ 422", async () => {
    const ana = await registeredUser("ana@example.com", { verified: true });
    for (const handle of ["admin", "pawbook.oficial", "lu", "luna gato"]) {
      const res = await call("POST", "/v1/pets", { token: ana.token, body: petBody(handle) });
      expect(res.status).toBe(422);
    }
  });
});

describe("límite de 10 mascotas activas (FR-PET-001)", () => {
  test("12 altas simultáneas dejan exactamente 10 y la 11.ª secuencial también falla", async () => {
    const ana = await registeredUser("ana@example.com", { verified: true });
    const responses = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        call("POST", "/v1/pets", { token: ana.token, body: petBody(`mascota${i}`) }),
      ),
    );
    const statuses = responses.map((res) => res.status);
    expect(statuses.filter((status) => status === 201)).toHaveLength(10);
    expect(statuses.filter((status) => status === 409)).toHaveLength(2);
    const [row] = await database.sql`
      select count(*)::int as total from pets.pets where owner_id = ${ana.id}`;
    expect(row?.total).toBe(10);

    const eleventh = await call("POST", "/v1/pets", {
      token: ana.token,
      body: petBody("la.once"),
    });
    expect(eleventh.status).toBe(409);
    expect(ProblemSchema.parse(await eleventh.json()).detail).toContain("10 mascotas");
  });
});

describe("mascota activa y tokens de Stream", () => {
  test("POST /v1/stream/token con el adaptador falso: Feeds por mascota y Chat por usuario", async () => {
    const ana = await registeredUser("ana@example.com", { verified: true });
    const pet = await createPet(ana, "luna");
    const res = await call("POST", "/v1/stream/token", {
      token: ana.token,
      headers: { "X-Pet-Id": pet.id },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const tokens = StreamTokenResponseSchema.parse(await res.json());
    expect(tokens).toMatchObject({
      apiKey: "fake-stream-api-key",
      feedsUserId: `pet_${pet.id}`,
      chatUserId: `usr_${ana.id}`,
    });
    expect(tokens.feedsToken).toStartWith(`fake.pet_${pet.id}.`);
    expect(tokens.chatToken).toStartWith(`fake.usr_${ana.id}.`);
    const ttl = new Date(tokens.expiresAt).getTime() - Date.now();
    expect(ttl).toBeGreaterThan(59 * 60_000);
    expect(ttl).toBeLessThanOrEqual(24 * 60 * 60_000);
  });

  test("X-Pet-Id de otro usuario o inexistente ⇒ 403 idéntico; sin cabecera ⇒ 400", async () => {
    const ana = await registeredUser("ana@example.com", { verified: true });
    const bruno = await registeredUser("bruno@example.com", { verified: true });
    const pet = await createPet(ana, "luna");

    const foreign = await call("POST", "/v1/stream/token", {
      token: bruno.token,
      headers: { "X-Pet-Id": pet.id },
    });
    const missing = await call("POST", "/v1/stream/token", {
      token: bruno.token,
      headers: { "X-Pet-Id": "0192f5e4-7c1a-7b3e-9a40-5d1f0c2b8e61" },
    });
    expect(foreign.status).toBe(403);
    expect(missing.status).toBe(403);
    expect(ProblemSchema.parse(await foreign.json()).detail).toBe(
      ProblemSchema.parse(await missing.json()).detail,
    );
    expect((await call("POST", "/v1/stream/token", { token: bruno.token })).status).toBe(400);
    expect(
      (await call("POST", "/v1/stream/token", { headers: { "X-Pet-Id": pet.id } })).status,
    ).toBe(401);
  });

  test("la propiedad se cachea 60 s en Valkey y archivar la invalida", async () => {
    const ana = await registeredUser("ana@example.com", { verified: true });
    const pet = await createPet(ana, "luna");
    const tokenFor = () =>
      call("POST", "/v1/stream/token", { token: ana.token, headers: { "X-Pet-Id": pet.id } });

    expect((await tokenFor()).status).toBe(200);
    const key = `${PREFIX}owner:${pet.id}`;
    expect(await redis.get(key)).toBe(ana.id);
    const ttl = await redis.pttl(key);
    expect(ttl).toBeGreaterThan(50_000);
    expect(ttl).toBeLessThanOrEqual(60_000);

    // Prueba de que se usa la caché: un cambio por fuera del caso de uso no se ve todavía.
    await database.sql`update pets.pets set owner_id = gen_random_uuid() where id = ${pet.id}`;
    expect((await tokenFor()).status).toBe(200);
    await database.sql`update pets.pets set owner_id = ${ana.id} where id = ${pet.id}`;

    // Archivar por el caso de uso invalida la entrada al momento.
    expect((await call("POST", `/v1/pets/${pet.id}/archive`, { token: ana.token })).status).toBe(
      204,
    );
    expect(await redis.get(key)).toBeNull();
    expect((await tokenFor()).status).toBe(403);
    expect(await redis.get(key)).toBeNull();
  });

  test("el evento de creación llega al outbox y el worker crea el usuario pet_<id>", async () => {
    const ana = await registeredUser("ana@example.com", { verified: true });
    const pet = await createPet(ana, "luna");
    const [row] = await database.sql`
      select event_type, payload, published_at from platform.outbox
      where event_type = 'pets.pet-created'`;
    expect(row).toMatchObject({ payload: { petId: pet.id, ownerId: ana.id }, published_at: null });

    // Relay + handlers reales de pg-boss, con la identidad de Stream en memoria.
    const boss = new PgBoss({ connectionString: database.url, max: 3 });
    boss.on("error", () => {});
    await boss.start();
    try {
      await registerEventHandlers(
        boss,
        petIdentityHandlers(built.social.deps),
        pino({ level: "silent" }),
      );
      const relay = new OutboxRelay(boss, pino({ level: "silent" }));
      // Solo los eventos de pets: los de identity no tienen handler en esta prueba.
      await relay.publishBatch();
      const deadline = Date.now() + 15_000;
      while (!identities.users.has(`pet_${pet.id}`) && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      expect(identities.users.get(`pet_${pet.id}`)).toEqual({
        streamUserId: `pet_${pet.id}`,
        handle: "luna",
        name: "Luna",
        avatarMediaId: null,
        active: true,
      });
    } finally {
      await boss.stop({ graceful: false });
    }
  });
});
