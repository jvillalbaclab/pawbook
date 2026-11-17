import { describe, expect, test } from "bun:test";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { fixedClock } from "../../../shared/clock";
import { uuidv7 } from "../../../shared/ids";
import { Argon2idPasswordHasher } from "./argon2-password-hasher";
import { JoseGoogleIdTokenVerifier } from "./google-id-token-verifier";
import { HibpBreachedPasswordChecker } from "./hibp-breached-password-checker";
import { JwtAccessTokens } from "./jwt-access-tokens";

describe("Argon2idPasswordHasher (NFR-SEC-002)", () => {
  const bun = new Argon2idPasswordHasher("bun");
  const wasm = new Argon2idPasswordHasher("wasm");

  test("genera Argon2id con los parámetros de OWASP y verifica", async () => {
    const hash = await bun.hash("una frase larga y propia");
    expect(hash).toStartWith("$argon2id$v=19$m=19456,t=2,p=1$");
    expect(await bun.verify(hash, "una frase larga y propia")).toBe(true);
    expect(await bun.verify(hash, "otra")).toBe(false);
  });

  test("Bun.password y hash-wasm son intercambiables (Bun en producción, Node como alternativa)", async () => {
    const fromWasm = await wasm.hash("contraseña compartida");
    expect(fromWasm).toStartWith("$argon2id$v=19$m=19456,t=2,p=1$");
    expect(await bun.verify(fromWasm, "contraseña compartida")).toBe(true);
    expect(
      await wasm.verify(await bun.hash("contraseña compartida"), "contraseña compartida"),
    ).toBe(true);
  });

  test("un hash que no es Argon2id nunca valida", async () => {
    expect(await bun.verify("$2b$10$abcdefghijklmnopqrstuv", "x")).toBe(false);
    expect(await wasm.verify("basura", "x")).toBe(false);
  });
});

describe("JwtAccessTokens (FR-AUTH-004)", () => {
  const secret = "s".repeat(32);
  const claims = { userId: uuidv7(), sessionId: uuidv7(), emailVerified: false };

  test("emite un token de 15 minutos que se verifica con sus claims", async () => {
    const clock = fixedClock(new Date("2026-11-17T10:00:00.000Z"));
    const tokens = new JwtAccessTokens(secret, clock);
    const { token, expiresAt } = await tokens.issue(claims, clock.now());
    expect(expiresAt.toISOString()).toBe("2026-11-17T10:15:00.000Z");
    expect(await tokens.verify(token)).toEqual(claims);

    clock.advance(15 * 60 * 1000);
    expect(await tokens.verify(token)).toBeNull();
  });

  test("rechaza tokens firmados con otra clave, manipulados o sin firma", async () => {
    const now = new Date();
    const mine = new JwtAccessTokens(secret);
    const other = new JwtAccessTokens("o".repeat(32));
    const { token } = await other.issue(claims, now);
    expect(await mine.verify(token)).toBeNull();

    const [header, , signature] = (await mine.issue(claims, now)).token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: uuidv7(), sid: uuidv7(), ev: true })).toString(
      "base64url",
    );
    expect(await mine.verify(`${header}.${forged}.${signature}`)).toBeNull();
    const none = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
    expect(await mine.verify(`${none}.${forged}.`)).toBeNull();
  });

  test("exige un secreto de al menos 32 caracteres", () => {
    expect(() => new JwtAccessTokens("corto")).toThrow(/32/);
  });
});

// Claves RSA locales en lugar del JWKS de Google: el test no necesita red.
const { publicKey, privateKey } = await generateKeyPair("RS256");
const googleJwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256" };

describe("JoseGoogleIdTokenVerifier (FR-AUTH-003, sin red)", () => {
  const keys = createLocalJWKSet({ keys: [googleJwk] });
  const verifier = new JoseGoogleIdTokenVerifier({ clientIds: ["web.apps"], keys });

  const idToken = (overrides: { iss?: string; aud?: string; exp?: string; key?: CryptoKey } = {}) =>
    new SignJWT({ email: "ana@example.com", email_verified: true })
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setSubject("1234567890")
      .setIssuer(overrides.iss ?? "https://accounts.google.com")
      .setAudience(overrides.aud ?? "web.apps")
      .setIssuedAt()
      .setExpirationTime(overrides.exp ?? "1h")
      .sign(overrides.key ?? privateKey);

  test("acepta un ID token válido y devuelve la identidad", async () => {
    expect(await verifier.verify(await idToken())).toEqual({
      subject: "1234567890",
      email: "ana@example.com",
      emailVerified: true,
    });
  });

  test("rechaza emisor, audiencia, caducidad o firma incorrectos", async () => {
    const stranger = await generateKeyPair("RS256");
    expect(await verifier.verify(await idToken({ iss: "https://evil.example" }))).toBeNull();
    expect(await verifier.verify(await idToken({ aud: "otra-app" }))).toBeNull();
    expect(await verifier.verify(await idToken({ exp: "-1h" }))).toBeNull();
    expect(await verifier.verify(await idToken({ key: stranger.privateKey }))).toBeNull();
    expect(await verifier.verify("no-es-un-jwt")).toBeNull();
  });

  test("exige al menos un client ID", () => {
    expect(() => new JoseGoogleIdTokenVerifier({ clientIds: [], keys })).toThrow();
  });
});

describe("HibpBreachedPasswordChecker (k-anonimato)", () => {
  // SHA-1("password") = 5BAA6 1E4C9B93F3F0682250B6CF8331B7EE68FD8
  const response = (body: string, status = 200) =>
    (async () => new Response(body, { status })) as unknown as typeof fetch;

  test("solo envía el prefijo y detecta el sufijo en la respuesta", async () => {
    let requested = "";
    const fetchSpy = (async (input: string | URL | Request) => {
      requested = String(input);
      return new Response("1E4C9B93F3F0682250B6CF8331B7EE68FD8:9659365\r\nAAAA:0");
    }) as typeof fetch;
    const checker = new HibpBreachedPasswordChecker({ fetch: fetchSpy });
    expect(await checker.isBreached("password")).toBe(true);
    expect(requested).toBe("https://api.pwnedpasswords.com/range/5BAA6");
  });

  test("ignora el relleno (contador 0) y las contraseñas ausentes", async () => {
    const padded = new HibpBreachedPasswordChecker({
      fetch: response("1E4C9B93F3F0682250B6CF8331B7EE68FD8:0"),
    });
    expect(await padded.isBreached("password")).toBe(false);
  });

  test("si HIBP falla, deja pasar e informa (fail-open)", async () => {
    const failures: unknown[] = [];
    const checker = new HibpBreachedPasswordChecker({
      fetch: response("error", 503),
      onUnavailable: (error) => failures.push(error),
    });
    expect(await checker.isBreached("password")).toBe(false);
    expect(failures).toHaveLength(1);
  });
});
