import { describe, expect, test } from "bun:test";
import { fixedClock } from "../../../shared/clock";
import type { Uuid } from "../../../shared/ids";
import { REFRESH_TOKEN_TTL_MS } from "../domain/session";
import { getAccount } from "./account";
import { googleSignIn, signIn } from "./authentication";
import { requestPasswordReset, resetPassword } from "./password-recovery";
import { resendVerification, signUp, verifyEmail } from "./registration";
import { listSessions, refreshSession, revokeSession, signOut } from "./sessions";
import { FakeGoogleVerifier, memoryIdentityDeps, TERMS_VERSION } from "./testing/in-memory";

const EMAIL = "ana@example.com";
const PASSWORD = "una frase larga y propia";
const signUpInput = {
  email: "  Ana@Example.com ",
  password: PASSWORD,
  birthDate: "1995-04-23",
  termsVersion: TERMS_VERSION,
};

/** Extrae el token del enlace (`#token=...`) del último correo de una plantilla. */
function tokenFrom(deps: ReturnType<typeof memoryIdentityDeps>, template: string): string {
  const text = deps.mail.lastTo(EMAIL, template)?.text ?? "";
  const match = /#token=([A-Za-z0-9_-]+)/.exec(text);
  if (match?.[1] === undefined) throw new Error(`No hay enlace en el correo ${template}`);
  return match[1];
}

function setup() {
  const clock = fixedClock(new Date("2026-11-17T10:00:00.000Z"));
  return { deps: memoryIdentityDeps({ clock }), clock };
}

async function registered() {
  const ctx = setup();
  const result = await signUp(ctx.deps, signUpInput);
  expect(result.ok).toBe(true);
  return ctx;
}

describe("signUp (FR-AUTH-001, OR-LEG-001)", () => {
  test("crea la cuenta pendiente, registra los términos, emite el evento y envía el enlace", async () => {
    const { deps } = await registered();
    const [user] = deps.store.state.users.values();
    expect(user?.email).toBe(EMAIL);
    expect(user?.emailVerifiedAt).toBeNull();
    expect(user?.passwordHash).toBe(`fake$${PASSWORD}`);
    expect(deps.store.state.terms).toEqual([
      expect.objectContaining({ userId: user?.id, version: TERMS_VERSION }),
    ]);
    expect(deps.store.state.events.map((event) => event.type)).toEqual([
      "identity.user-registered",
    ]);
    expect(deps.store.state.events[0]?.payload).toEqual({
      userId: user?.id ?? "falta",
      method: "password",
    });
    const mail = deps.mail.lastTo(EMAIL, "identity.verify-email");
    expect(mail?.text).toContain("https://pawbook.test/verificar-correo#token=");
  });

  test("con un correo existente responde igual y avisa al buzón sin crear nada", async () => {
    const { deps } = await registered();
    const again = await signUp(deps, { ...signUpInput, password: "otra frase distinta" });
    expect(again).toEqual({ ok: true, value: undefined });
    expect(deps.store.state.users.size).toBe(1);
    expect(deps.mail.lastTo(EMAIL)?.template).toBe("identity.account-exists");
  });

  test("rechaza menores de la edad mínima, términos viejos y contraseñas filtradas", async () => {
    const { deps } = setup();
    expect(await signUp(deps, { ...signUpInput, birthDate: "2010-01-01" })).toEqual({
      ok: false,
      error: "underage",
    });
    expect(await signUp(deps, { ...signUpInput, termsVersion: "2020-01-01" })).toEqual({
      ok: false,
      error: "terms-outdated",
    });
    expect(await signUp(deps, { ...signUpInput, password: "password123456" })).toEqual({
      ok: false,
      error: "breached-password",
    });
    expect(deps.store.state.users.size).toBe(0);
    expect(deps.mail.sent).toHaveLength(0);
  });

  test("si el correo no sale, el alta se mantiene y el fallo se informa", async () => {
    const { deps } = setup();
    const failing = {
      ...deps,
      email: {
        send: async () => {
          throw new Error("smtp caído");
        },
      },
    };
    expect((await signUp(failing, signUpInput)).ok).toBe(true);
    expect(deps.store.state.users.size).toBe(1);
    expect(deps.errors).toHaveLength(1);
  });
});

describe("verifyEmail (FR-AUTH-002)", () => {
  test("activa la cuenta y es idempotente", async () => {
    const { deps } = await registered();
    const token = tokenFrom(deps, "identity.verify-email");
    expect((await verifyEmail(deps, token)).ok).toBe(true);
    const [user] = deps.store.state.users.values();
    expect(user?.emailVerifiedAt).not.toBeNull();
    expect(deps.store.state.events.map((event) => event.type)).toContain("identity.email-verified");
    expect((await verifyEmail(deps, token)).ok).toBe(true);
  });

  test("un enlace caducado (24 h) da expired-token y se puede reenviar", async () => {
    const { deps, clock } = await registered();
    const token = tokenFrom(deps, "identity.verify-email");
    clock.advance(24 * 60 * 60 * 1000);
    expect(await verifyEmail(deps, token)).toEqual({ ok: false, error: "expired-token" });

    const [user] = deps.store.state.users.values();
    expect((await resendVerification(deps, user?.id as Uuid)).ok).toBe(true);
    const fresh = tokenFrom(deps, "identity.verify-email");
    expect(fresh).not.toBe(token);
    expect((await verifyEmail(deps, fresh)).ok).toBe(true);
    expect(await resendVerification(deps, user?.id as Uuid)).toEqual({
      ok: false,
      error: "already-verified",
    });
  });

  test("un token desconocido es invalid-token", async () => {
    const { deps } = setup();
    expect(await verifyEmail(deps, "no-existe")).toEqual({ ok: false, error: "invalid-token" });
  });
});

describe("signIn y sesiones (FR-AUTH-004)", () => {
  test("inicia sesión aunque el correo no esté verificado y lo refleja en el token", async () => {
    const { deps } = await registered();
    const result = await signIn(deps, { email: EMAIL, password: PASSWORD, userAgent: "Bun" });
    if (!result.ok) throw new Error("debería iniciar sesión");
    expect(result.value.accessToken).toEndWith(":false");
    expect(result.value.account.termsAcceptance?.version).toBe(TERMS_VERSION);
    expect(deps.store.state.sessions.size).toBe(1);
  });

  test("las credenciales incorrectas y los correos inexistentes dan el mismo error", async () => {
    const { deps } = await registered();
    expect(await signIn(deps, { email: EMAIL, password: "incorrecta" })).toEqual({
      ok: false,
      error: "invalid-credentials",
    });
    expect(await signIn(deps, { email: "nadie@example.com", password: PASSWORD })).toEqual({
      ok: false,
      error: "invalid-credentials",
    });
  });

  test("refresh rota el token y el reuso del anterior revoca toda la familia", async () => {
    const { deps } = await registered();
    const login = await signIn(deps, { email: EMAIL, password: PASSWORD });
    if (!login.ok) throw new Error("login");
    const first = login.value.refreshToken;

    const rotated = await refreshSession(deps, first);
    if (!rotated.ok) throw new Error("refresh");
    const second = rotated.value.refreshToken;
    expect(second).not.toBe(first);
    expect(rotated.value.sessionId).toBe(login.value.sessionId);

    // Alguien presenta el token ya consumido: se revoca la sesión entera...
    expect(await refreshSession(deps, first)).toEqual({
      ok: false,
      error: "invalid-refresh-token",
    });
    const [session] = deps.store.state.sessions.values();
    expect(session?.revokedReason).toBe("reuse-detected");
    // ...incluido el token nuevo, que ya no sirve.
    expect((await refreshSession(deps, second)).ok).toBe(false);
  });

  test("un refresh token caducado (30 días) no sirve", async () => {
    const { deps, clock } = await registered();
    const login = await signIn(deps, { email: EMAIL, password: PASSWORD });
    if (!login.ok) throw new Error("login");
    clock.advance(REFRESH_TOKEN_TTL_MS);
    expect((await refreshSession(deps, login.value.refreshToken)).ok).toBe(false);
  });

  test("sign-out revoca la sesión y es idempotente", async () => {
    const { deps } = await registered();
    const login = await signIn(deps, { email: EMAIL, password: PASSWORD });
    if (!login.ok) throw new Error("login");
    await signOut(deps, login.value.refreshToken);
    await signOut(deps, login.value.refreshToken);
    await signOut(deps, "desconocido");
    expect((await refreshSession(deps, login.value.refreshToken)).ok).toBe(false);
  });

  test("lista y cierra sesiones propias; una ajena responde not-found", async () => {
    const { deps, clock } = await registered();
    const a = await signIn(deps, { email: EMAIL, password: PASSWORD });
    clock.advance(1_000);
    const b = await signIn(deps, { email: EMAIL, password: PASSWORD });
    if (!a.ok || !b.ok) throw new Error("login");
    const userId = a.value.account.user.id;

    const page = await listSessions(deps, userId, { limit: 1 });
    expect(page.items.map((s) => s.id)).toEqual([b.value.sessionId]);
    const next = await listSessions(deps, userId, { limit: 1, cursor: page.nextCursor ?? "" });
    expect(next.items.map((s) => s.id)).toEqual([a.value.sessionId]);
    expect(next.nextCursor).toBeNull();

    expect(
      await revokeSession(deps, "0192f5e4-7c1a-7b3e-9a40-5d1f0c2b8e61" as Uuid, a.value.sessionId),
    ).toEqual({
      ok: false,
      error: "not-found",
    });
    expect((await revokeSession(deps, userId, a.value.sessionId)).ok).toBe(true);
    expect((await listSessions(deps, userId, { limit: 10 })).items).toHaveLength(1);
  });
});

describe("recuperación de contraseña (FR-AUTH-005)", () => {
  test("un correo inexistente no hace nada visible", async () => {
    const { deps } = setup();
    await requestPasswordReset(deps, "nadie@example.com");
    expect(deps.mail.sent).toHaveLength(0);
  });

  test("el enlace cambia la contraseña una sola vez, cierra sesiones y verifica el correo", async () => {
    const { deps } = await registered();
    const login = await signIn(deps, { email: EMAIL, password: PASSWORD });
    if (!login.ok) throw new Error("login");

    await requestPasswordReset(deps, "ANA@example.com");
    const token = tokenFrom(deps, "identity.password-reset");
    expect(await resetPassword(deps, { token, newPassword: "password123456" })).toEqual({
      ok: false,
      error: "breached-password",
    });
    expect((await resetPassword(deps, { token, newPassword: "nueva frase segura" })).ok).toBe(true);
    expect(await resetPassword(deps, { token, newPassword: "otra frase segura" })).toEqual({
      ok: false,
      error: "invalid-token",
    });

    expect((await refreshSession(deps, login.value.refreshToken)).ok).toBe(false);
    expect((await signIn(deps, { email: EMAIL, password: PASSWORD })).ok).toBe(false);
    expect((await signIn(deps, { email: EMAIL, password: "nueva frase segura" })).ok).toBe(true);
    const [user] = deps.store.state.users.values();
    expect(user?.emailVerifiedAt).not.toBeNull();
  });

  test("el enlace caduca en 1 hora y pedir otro invalida el anterior", async () => {
    const { deps, clock } = await registered();
    await requestPasswordReset(deps, EMAIL);
    const old = tokenFrom(deps, "identity.password-reset");
    await requestPasswordReset(deps, EMAIL);
    const fresh = tokenFrom(deps, "identity.password-reset");
    expect((await resetPassword(deps, { token: old, newPassword: "nueva frase segura" })).ok).toBe(
      false,
    );
    clock.advance(60 * 60 * 1000);
    expect(await resetPassword(deps, { token: fresh, newPassword: "nueva frase segura" })).toEqual({
      ok: false,
      error: "expired-token",
    });
  });
});

describe("googleSignIn (FR-AUTH-003)", () => {
  function withGoogle() {
    const ctx = setup();
    const google = new FakeGoogleVerifier();
    google.tokens.set("tok-ana", { subject: "g-1", email: EMAIL, emailVerified: true });
    google.tokens.set("tok-unverified", { subject: "g-2", email: EMAIL, emailVerified: false });
    return { ...ctx, deps: { ...ctx.deps, google } };
  }

  test("deshabilitado si no hay configuración", async () => {
    const { deps } = setup();
    expect(await googleSignIn(deps, { idToken: "x" })).toEqual({
      ok: false,
      error: "provider-disabled",
    });
  });

  test("rechaza tokens inválidos y correos que Google no verificó", async () => {
    const { deps } = withGoogle();
    expect((await googleSignIn(deps, { idToken: "falso" })).ok).toBe(false);
    expect(await googleSignIn(deps, { idToken: "tok-unverified" })).toEqual({
      ok: false,
      error: "email-not-verified-by-provider",
    });
  });

  test("una cuenta nueva exige fecha de nacimiento y términos y queda verificada", async () => {
    const { deps } = withGoogle();
    expect(await googleSignIn(deps, { idToken: "tok-ana" })).toEqual({
      ok: false,
      error: "registration-data-required",
    });
    expect(
      await googleSignIn(deps, {
        idToken: "tok-ana",
        birthDate: "2012-01-01",
        termsVersion: TERMS_VERSION,
      }),
    ).toEqual({ ok: false, error: "underage" });

    const created = await googleSignIn(deps, {
      idToken: "tok-ana",
      birthDate: "1995-04-23",
      termsVersion: TERMS_VERSION,
    });
    if (!created.ok) throw new Error("google");
    expect(created.value.isNewUser).toBe(true);
    expect(created.value.account.user.emailVerifiedAt).not.toBeNull();
    expect(created.value.account.termsAcceptance?.version).toBe(TERMS_VERSION);
    expect(deps.store.state.events.at(-1)?.payload).toMatchObject({ method: "google" });

    const again = await googleSignIn(deps, { idToken: "tok-ana" });
    expect(again.ok && again.value.isNewUser).toBe(false);
  });

  test("vincula una cuenta pendiente y descarta su contraseña no probada", async () => {
    const { deps } = withGoogle();
    await signUp(deps, signUpInput);
    const login = await signIn(deps, { email: EMAIL, password: PASSWORD });
    if (!login.ok) throw new Error("login");

    const linked = await googleSignIn(deps, { idToken: "tok-ana" });
    if (!linked.ok) throw new Error("google");
    expect(linked.value.isNewUser).toBe(false);
    expect(linked.value.account.user.emailVerifiedAt).not.toBeNull();
    // Quien registró la cuenta con ese correo sin probarlo pierde la contraseña y sus sesiones.
    expect((await signIn(deps, { email: EMAIL, password: PASSWORD })).ok).toBe(false);
    expect((await refreshSession(deps, login.value.refreshToken)).ok).toBe(false);
    expect(deps.store.state.users.size).toBe(1);
  });

  test("vincula una cuenta verificada sin tocar su contraseña", async () => {
    const { deps } = withGoogle();
    await signUp(deps, signUpInput);
    await verifyEmail(deps, tokenFrom(deps, "identity.verify-email"));
    expect((await googleSignIn(deps, { idToken: "tok-ana" })).ok).toBe(true);
    expect((await signIn(deps, { email: EMAIL, password: PASSWORD })).ok).toBe(true);
  });
});

describe("getAccount", () => {
  test("devuelve la cuenta con su última aceptación de términos o null", async () => {
    const { deps } = await registered();
    const [user] = deps.store.state.users.values();
    const account = await getAccount(deps, user?.id as Uuid);
    expect(account?.user.email).toBe(EMAIL);
    expect(account?.termsAcceptance?.version).toBe(TERMS_VERSION);
    expect(await getAccount(deps, "0192f5e4-7c1a-7b3e-9a40-5d1f0c2b8e61" as Uuid)).toBeNull();
  });
});
