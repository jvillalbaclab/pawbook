import { describe, expect, test } from "bun:test";
import { fakeScheduler, flush } from "../../../test/fake-scheduler";
import { ApiError } from "../api-client/problem";
import { createStreamSession, type StreamConnector, type StreamTokens } from "./stream-session";

/*
 * Capa de tiempo real: tokens por mascota solo en memoria, renovación antes de caducar,
 * reconexión al cambiar de mascota y, con cambios rápidos, la última elección gana.
 */

const HOUR = 3_600_000;

function tokensFor(petId: string, expiresAt: number): StreamTokens {
  return {
    apiKey: "key",
    feedsUserId: `pet_${petId}`,
    feedsToken: `fake.pet_${petId}.${expiresAt}`,
    chatUserId: "usr_ana",
    chatToken: null,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

/** Servidor de tokens controlable: cada solicitud queda pendiente hasta resolverla. */
function tokenServer(clock: { now: () => number }) {
  const requests: {
    petId: string;
    signal: AbortSignal;
    resolve: () => void;
    reject: (error: unknown) => void;
  }[] = [];
  const requestTokens = (petId: string, signal: AbortSignal) =>
    new Promise<StreamTokens>((resolve, reject) => {
      requests.push({
        petId,
        signal,
        resolve: () => resolve(tokensFor(petId, clock.now() + HOUR)),
        reject,
      });
    });
  return { requests, requestTokens };
}

function recordingConnector(delayMs = 0) {
  const log: string[] = [];
  const connector: StreamConnector = {
    async connect(tokens) {
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
      log.push(`connect ${tokens.feedsUserId}`);
    },
    disconnect() {
      log.push("disconnect");
    },
  };
  return { log, connector };
}

function setup(delayMs = 0) {
  const clock = fakeScheduler(Date.parse("2026-11-17T10:00:00Z"));
  const server = tokenServer(clock);
  const { log, connector } = recordingConnector(delayMs);
  const errors: unknown[] = [];
  const session = createStreamSession({
    requestTokens: server.requestTokens,
    connector,
    now: clock.now,
    schedule: clock.schedule,
    retryDelayMs: 1_000,
    onError: (error) => errors.push(error),
  });
  return { clock, server, log, session, errors };
}

describe("conexión por mascota", () => {
  test("pide tokens con la mascota activa y conecta Feeds como ella", async () => {
    const { server, log, session } = setup();
    session.setActivePet("luna");
    expect(server.requests.map((request) => request.petId)).toEqual(["luna"]);
    server.requests[0].resolve();
    await flush();
    await session.idle();
    expect(log).toEqual(["connect pet_luna"]);
    expect(session.snapshot().tokens?.feedsUserId).toBe("pet_luna");
  });

  test("repetir la misma mascota no vuelve a pedir tokens", () => {
    const { server, session } = setup();
    session.setActivePet("luna");
    session.setActivePet("luna");
    expect(server.requests).toHaveLength(1);
  });

  test("al cambiar de mascota desconecta y reconecta con el token de la nueva", async () => {
    const { server, log, session } = setup();
    session.setActivePet("luna");
    server.requests[0].resolve();
    await flush();
    session.setActivePet("rocco");
    expect(session.snapshot()).toEqual({ petId: "rocco", tokens: null });
    server.requests[1].resolve();
    await flush();
    await session.idle();
    expect(log).toEqual(["connect pet_luna", "disconnect", "connect pet_rocco"]);
  });

  test("al cerrar sesión (null) desconecta y olvida los tokens", async () => {
    const { server, log, session, clock } = setup();
    session.setActivePet("luna");
    server.requests[0].resolve();
    await flush();
    session.setActivePet(null);
    await session.idle();
    expect(log).toEqual(["connect pet_luna", "disconnect"]);
    expect(session.snapshot()).toEqual({ petId: null, tokens: null });
    expect(clock.pending()).toEqual([]); // sin renovación pendiente
  });
});

describe("cambios rápidos: gana la última elección", () => {
  test("aborta las solicitudes anteriores y descarta sus respuestas", async () => {
    const { server, log, session } = setup();
    session.setActivePet("luna");
    session.setActivePet("rocco");
    session.setActivePet("kira");
    expect(server.requests.map((request) => request.signal.aborted)).toEqual([true, true, false]);
    // Las respuestas viejas llegan tarde y en desorden: no cuentan.
    server.requests[2].resolve();
    server.requests[0].resolve();
    server.requests[1].resolve();
    await flush();
    await session.idle();
    expect(log).toEqual(["connect pet_kira"]);
    expect(session.snapshot().tokens?.feedsUserId).toBe("pet_kira");
  });

  test("un connect lento de la anterior nunca queda por encima de la nueva", async () => {
    const { server, log, session } = setup(20);
    session.setActivePet("luna");
    server.requests[0].resolve();
    await flush(); // connect(luna) en curso, tarda 20 ms
    session.setActivePet("rocco");
    server.requests[1].resolve();
    await flush();
    await session.idle();
    expect(log).toEqual(["connect pet_luna", "disconnect", "connect pet_rocco"]);
  });

  test("volver a la mascota anterior antes de que respondan pide tokens de nuevo", async () => {
    const { server, log, session } = setup();
    session.setActivePet("luna");
    session.setActivePet("rocco");
    session.setActivePet("luna");
    expect(server.requests.map((request) => request.petId)).toEqual(["luna", "rocco", "luna"]);
    server.requests[1].resolve();
    server.requests[2].resolve();
    await flush();
    await session.idle();
    expect(log).toEqual(["connect pet_luna"]);
  });
});

describe("renovación", () => {
  test("pide tokens nuevos 5 minutos antes de expiresAt y vuelve a conectar", async () => {
    const { server, log, session, clock } = setup();
    session.setActivePet("luna");
    server.requests[0].resolve();
    await flush();
    expect(clock.pending()).toEqual([HOUR - 5 * 60_000]);
    clock.advance(HOUR - 5 * 60_000);
    expect(server.requests.map((request) => request.petId)).toEqual(["luna", "luna"]);
    server.requests[1].resolve();
    await flush();
    await session.idle();
    expect(log).toEqual(["connect pet_luna", "connect pet_luna"]);
  });

  test("cambiar de mascota cancela la renovación de la anterior", async () => {
    const { server, session, clock } = setup();
    session.setActivePet("luna");
    server.requests[0].resolve();
    await flush();
    session.setActivePet("rocco");
    clock.advance(HOUR);
    expect(server.requests.map((request) => request.petId)).toEqual(["luna", "rocco"]);
  });

  test("un fallo de red se reintenta con espera creciente; un 403 no", async () => {
    const { server, session, clock, errors } = setup();
    session.setActivePet("luna");
    server.requests[0].reject(new ApiError({ status: 0, code: "network-error" }));
    await flush();
    expect(clock.pending()).toEqual([1_000]);
    clock.advance(1_000);
    server.requests[1].reject(new ApiError({ status: 503, code: "service-unavailable" }));
    await flush();
    expect(clock.pending()).toEqual([2_000]);
    clock.advance(2_000);
    server.requests[2].reject(new ApiError({ status: 403, code: "forbidden" }));
    await flush();
    expect(clock.pending()).toEqual([]);
    expect(errors).toHaveLength(3);
  });
});
