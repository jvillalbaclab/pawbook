import { describe, expect, test } from "bun:test";
import { uuidv7 } from "../../../shared/ids";
import { ageOn, checkBirthDate } from "./age";
import { checkOneTimeToken, type OneTimeToken } from "./one-time-token";
import { generateOpaqueToken, hashOpaqueToken } from "./opaque-token";
import { decideRefresh, type RefreshToken, type Session, truncateUserAgent } from "./session";
import { normalizeEmail, userStatus } from "./user";

const at = (iso: string) => new Date(iso);

describe("edad mínima", () => {
  const today = at("2026-11-17T10:00:00Z");

  test("cuenta los años cumplidos según el día exacto", () => {
    expect(ageOn("2008-11-17", today)).toBe(18);
    expect(ageOn("2008-11-18", today)).toBe(17);
    expect(ageOn("2008-12-01", today)).toBe(17);
  });

  test("quien nació un 29 de febrero cumple el 1 de marzo en años no bisiestos", () => {
    expect(ageOn("2008-02-29", at("2026-02-28T12:00:00Z"))).toBe(17);
    expect(ageOn("2008-02-29", at("2026-03-01T00:00:00Z"))).toBe(18);
  });

  test("rechaza fechas imposibles, futuras o absurdas", () => {
    expect(checkBirthDate("2000-02-30", 18, today)).toBe("invalid");
    expect(checkBirthDate("2027-01-01", 18, today)).toBe("invalid");
    expect(checkBirthDate("1850-01-01", 18, today)).toBe("invalid");
    expect(checkBirthDate("17/11/2000", 18, today)).toBe("invalid");
  });

  test("aplica la edad mínima configurada", () => {
    expect(checkBirthDate("2010-01-01", 18, today)).toBe("underage");
    expect(checkBirthDate("2010-01-01", 16, today)).toBe("ok");
    expect(checkBirthDate("2008-11-17", 18, today)).toBe("ok");
  });
});

describe("rotación de refresh tokens", () => {
  const now = at("2026-11-17T10:00:00Z");
  const session: Session = {
    id: uuidv7(),
    userId: uuidv7(),
    userAgent: null,
    createdAt: now,
    lastUsedAt: now,
    expiresAt: at("2026-12-17T10:00:00Z"),
    revokedAt: null,
    revokedReason: null,
  };
  const token: RefreshToken = {
    id: uuidv7(),
    sessionId: session.id,
    tokenHash: "h",
    createdAt: now,
    expiresAt: at("2026-12-17T10:00:00Z"),
    usedAt: null,
  };

  test("un token vigente y sin usar se rota", () => {
    expect(decideRefresh(token, session, now)).toBe("rotate");
  });

  test("un token ya usado es un reuso aunque haya caducado", () => {
    const used = { ...token, usedAt: now, expiresAt: at("2026-11-01T00:00:00Z") };
    expect(decideRefresh(used, session, now)).toBe("reuse-detected");
  });

  test("un token caducado o de una sesión revocada se rechaza", () => {
    expect(decideRefresh({ ...token, expiresAt: now }, session, now)).toBe("expired");
    const revoked = { ...session, revokedAt: now, revokedReason: "sign-out" as const };
    expect(decideRefresh({ ...token, usedAt: now }, revoked, now)).toBe("revoked");
  });

  test("recorta el agente de usuario", () => {
    expect(truncateUserAgent(undefined)).toBeNull();
    expect(truncateUserAgent("   ")).toBeNull();
    expect(truncateUserAgent("x".repeat(500))?.length).toBe(200);
  });
});

describe("enlaces de un solo uso", () => {
  const now = at("2026-11-17T10:00:00Z");
  const token: OneTimeToken = {
    id: uuidv7(),
    userId: uuidv7(),
    purpose: "password-reset",
    tokenHash: "h",
    createdAt: now,
    expiresAt: at("2026-11-17T11:00:00Z"),
    consumedAt: null,
  };

  test("distingue válido, consumido y caducado", () => {
    expect(checkOneTimeToken(token, now)).toBe("valid");
    expect(checkOneTimeToken({ ...token, consumedAt: now }, now)).toBe("consumed");
    expect(checkOneTimeToken(token, at("2026-11-17T11:00:00Z"))).toBe("expired");
  });

  test("los tokens son aleatorios y solo se guarda su SHA-256", async () => {
    const a = generateOpaqueToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateOpaqueToken()).not.toBe(a);
    const hash = await hashOpaqueToken(a);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashOpaqueToken(a)).toBe(hash);
  });
});

describe("usuario", () => {
  test("normaliza el correo sin tocar puntos ni etiquetas", () => {
    expect(normalizeEmail("  Ana.Perez+pets@Example.COM ")).toBe("ana.perez+pets@example.com");
  });

  test("el estado se deriva de la verificación del correo", () => {
    expect(userStatus({ emailVerifiedAt: null })).toBe("pending_verification");
    expect(userStatus({ emailVerifiedAt: new Date() })).toBe("active");
  });
});
