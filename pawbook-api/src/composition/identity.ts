import type { Logger } from "pino";
import type { IdempotencyStore } from "../http/idempotency/store";
import type { AccessTokenVerifier } from "../http/middleware/auth";
import type { RateLimitStore } from "../http/rate-limit/store";
import { FileEmailSender, MemoryEmailSender } from "../infrastructure/email/email-senders";
import type {
  BreachedPasswordChecker,
  GoogleIdTokenVerifier,
  IdentityDeps,
  PasswordHasher,
} from "../modules/identity/application/ports";
import { identityRoutes } from "../modules/identity/http/routes";
import { Argon2idPasswordHasher } from "../modules/identity/infrastructure/argon2-password-hasher";
import {
  DrizzleExternalAccountRepository,
  DrizzleOneTimeTokenRepository,
  DrizzleSessionRepository,
  DrizzleTermsAcceptanceRepository,
  DrizzleUserRepository,
} from "../modules/identity/infrastructure/drizzle-repositories";
import { JoseGoogleIdTokenVerifier } from "../modules/identity/infrastructure/google-id-token-verifier";
import {
  HibpBreachedPasswordChecker,
  StaticBreachedPasswordChecker,
} from "../modules/identity/infrastructure/hibp-breached-password-checker";
import { JwtAccessTokens } from "../modules/identity/infrastructure/jwt-access-tokens";
import { type Clock, systemClock } from "../shared/clock";
import type { EmailSender } from "../shared/email";
import type { EventOutbox } from "../shared/events";
import type { UnitOfWork } from "../shared/unit-of-work";
import type { Config } from "./config";

/*
 * Wiring del módulo identity: adaptadores Drizzle, Argon2id, jose y correo. Los tests de
 * integración sustituyen lo que sale a la red (correo, Google, HIBP) con `overrides`.
 */
export type IdentityModuleOptions = {
  config: Config;
  logger: Logger;
  unitOfWork: UnitOfWork;
  outbox: EventOutbox;
  rateLimitStore: RateLimitStore;
  idempotencyStore: IdempotencyStore;
  overrides?: {
    clock?: Clock;
    email?: EmailSender;
    google?: GoogleIdTokenVerifier | null;
    breachedPasswords?: BreachedPasswordChecker;
    passwordHasher?: PasswordHasher;
    uniformResponseMs?: number;
  };
};

function emailSender(config: Config): EmailSender {
  return config.EMAIL_TRANSPORT === "file"
    ? new FileEmailSender(config.EMAIL_OUTBOX_DIR)
    : new MemoryEmailSender();
}

export function createIdentityModule(options: IdentityModuleOptions) {
  const { config, logger, overrides = {} } = options;
  const clock = overrides.clock ?? systemClock;
  const accessTokens = new JwtAccessTokens(config.AUTH_ACCESS_TOKEN_SECRET, clock);

  const google =
    overrides.google !== undefined
      ? overrides.google
      : config.GOOGLE_CLIENT_IDS.length > 0
        ? new JoseGoogleIdTokenVerifier({ clientIds: config.GOOGLE_CLIENT_IDS, clock })
        : null;

  const breachedPasswords =
    overrides.breachedPasswords ??
    (config.PASSWORD_BREACH_CHECK === "hibp"
      ? new HibpBreachedPasswordChecker({
          onUnavailable: (error) =>
            logger.warn({ err: error }, "breached password check unavailable"),
        })
      : new StaticBreachedPasswordChecker());

  const deps: IdentityDeps = {
    unitOfWork: options.unitOfWork,
    outbox: options.outbox,
    users: new DrizzleUserRepository(),
    terms: new DrizzleTermsAcceptanceRepository(),
    externalAccounts: new DrizzleExternalAccountRepository(),
    oneTimeTokens: new DrizzleOneTimeTokenRepository(),
    sessions: new DrizzleSessionRepository(),
    passwordHasher: overrides.passwordHasher ?? new Argon2idPasswordHasher(),
    breachedPasswords,
    accessTokens,
    google,
    email: overrides.email ?? emailSender(config),
    clock,
    settings: {
      minSignupAge: config.MIN_SIGNUP_AGE,
      termsVersion: config.TERMS_VERSION,
      webAppUrl: config.WEB_APP_URL,
    },
    // `context` lo construyen los casos de uso sin datos personales (NFR-OBS-002).
    reportError: (error, context) => logger.error({ err: error, ...context }, "identity error"),
  };

  const accessTokenVerifier: AccessTokenVerifier = accessTokens;
  const routes = identityRoutes({
    identity: deps,
    rateLimitStore: options.rateLimitStore,
    idempotencyStore: options.idempotencyStore,
    ...(overrides.uniformResponseMs === undefined
      ? {}
      : { uniformResponseMs: overrides.uniformResponseMs }),
  });

  return { deps, routes, accessTokenVerifier };
}
