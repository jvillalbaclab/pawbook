import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import Redis from "ioredis";
import pino from "pino";
import packageJson from "../package.json" with { type: "json" };
import { loadConfig } from "../src/composition/config";
import { createIdentityModule } from "../src/composition/identity";
import { createPetsModule } from "../src/composition/pets";
import { createSocialModule } from "../src/composition/social";
import { createApp } from "../src/http/app";
import { MemoryIdempotencyStore } from "../src/http/idempotency/store";
import { MemoryRateLimitStore } from "../src/http/rate-limit/store";
import type { EventOutbox } from "../src/shared/events";
import type { UnitOfWork } from "../src/shared/unit-of-work";

/*
 * Vuelca `contracts/openapi.json` sin levantar servidor ni conectar a Postgres o Valkey:
 * monta la app con las mismas rutas que `main.api.ts` y adaptadores que nunca se ejecutan
 * (generar el documento no llama a ningún caso de uso). De ese JSON salen los tipos de
 * `contracts/src/generated/openapi.ts` con los que la web tipa su cliente `openapi-fetch`.
 *
 * Uso: `bun run contracts:generate`. Al añadir un módulo a `main.api.ts`, añádelo también aquí.
 */

const OUTPUT = join(import.meta.dir, "../contracts/openapi.json");

const unused = (what: string) => () => {
  throw new Error(`${what} no debe usarse al volcar el OpenAPI`);
};

// Valores de relleno: solo satisfacen la validación de la configuración.
const config = loadConfig({
  DATABASE_URL: "postgres://unused@localhost:5432/unused",
  VALKEY_URL: "redis://localhost:6379",
  AUTH_ACCESS_TOKEN_SECRET: "x".repeat(32),
  EMAIL_TRANSPORT: "memory",
  PASSWORD_BREACH_CHECK: "off",
});
const logger = pino({ level: "silent" });
const rateLimitStore = new MemoryRateLimitStore();
const idempotencyStore = new MemoryIdempotencyStore();
const unitOfWork: UnitOfWork = { run: unused("UnitOfWork") };
const outbox: EventOutbox = { enqueue: unused("EventOutbox") };

const identity = createIdentityModule({
  config,
  logger,
  unitOfWork,
  outbox,
  rateLimitStore,
  idempotencyStore,
});

// lazyConnect: el cliente nunca abre conexión porque ningún caso de uso se ejecuta.
const valkey = new Redis(config.VALKEY_URL, { lazyConnect: true });
const pets = createPetsModule({ logger, unitOfWork, outbox, valkey, idempotencyStore });
const social = createSocialModule({
  config,
  logger,
  petProfiles: pets.petSocialProfile,
  activePet: pets.activePet,
});

const app = createApp({
  logger,
  version: packageJson.version,
  corsOrigins: [],
  readinessChecks: [],
  trustedProxyHops: 0,
  rateLimitStore,
  idempotencyStore,
  accessTokenVerifier: identity.accessTokenVerifier,
  moduleRoutes: [identity.routes, pets.routes, social.routes],
});

const response = await app.request("/v1/openapi.json");
if (!response.ok) throw new Error(`No se pudo generar el OpenAPI: HTTP ${response.status}`);
const document: unknown = await response.json();

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(document, null, 2)}\n`);
console.log(`OpenAPI escrito en ${OUTPUT}`);
