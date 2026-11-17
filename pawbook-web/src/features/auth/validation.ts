import {
  BirthDateSchema,
  EmailSchema,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PasswordSchema,
  type SignUpRequest,
} from "@pawbook/contracts";

/*
 * Validación de los formularios de acceso con los MISMOS esquemas Zod que usa la API
 * (@pawbook/contracts): la web no repite reglas como la longitud de la contraseña. Los
 * mensajes no salen de Zod sino del catálogo: cada fallo se reduce a un código.
 */

export { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH };

export type FieldErrorCode =
  | "email-invalid"
  | "password-required"
  | "password-too-short"
  | "password-too-long"
  | "passwords-mismatch"
  | "birth-date-invalid"
  | "terms-required";

export type FormErrors<Field extends string> = Partial<Record<Field, FieldErrorCode>>;

export type Validation<Field extends string, Value> =
  | { ok: true; value: Value }
  | { ok: false; errors: FormErrors<Field> };

function emailError(email: string): FieldErrorCode | undefined {
  return EmailSchema.safeParse(email).success ? undefined : "email-invalid";
}

function passwordPolicyError(password: string): FieldErrorCode | undefined {
  const result = PasswordSchema.safeParse(password);
  if (result.success) return undefined;
  return result.error.issues[0]?.code === "too_big" ? "password-too-long" : "password-too-short";
}

function birthDateError(birthDate: string): FieldErrorCode | undefined {
  return BirthDateSchema.safeParse(birthDate).success ? undefined : "birth-date-invalid";
}

function result<Field extends string, Value>(
  errors: Record<Field, FieldErrorCode | undefined>,
  value: Value,
): Validation<Field, Value> {
  const found = Object.fromEntries(
    Object.entries(errors).filter(([, code]) => code !== undefined),
  ) as FormErrors<Field>;
  return Object.keys(found).length === 0 ? { ok: true, value } : { ok: false, errors: found };
}

export type SignUpField = "email" | "password" | "birthDate" | "acceptedTerms";

export function validateSignUp(
  input: { email: string; password: string; birthDate: string; acceptedTerms: boolean },
  termsVersion: string,
): Validation<SignUpField, SignUpRequest> {
  const email = input.email.trim();
  return result<SignUpField, SignUpRequest>(
    {
      email: emailError(email),
      password: passwordPolicyError(input.password),
      birthDate: birthDateError(input.birthDate),
      acceptedTerms: input.acceptedTerms ? undefined : "terms-required",
    },
    { email, password: input.password, birthDate: input.birthDate, termsVersion },
  );
}

export type SignInField = "email" | "password";

/** En el login no se aplica la política de contraseña: solo que no esté vacía (como la API). */
export function validateSignIn(input: {
  email: string;
  password: string;
}): Validation<SignInField, { email: string; password: string }> {
  const email = input.email.trim();
  return result<SignInField, { email: string; password: string }>(
    {
      email: emailError(email),
      password:
        input.password.length === 0
          ? "password-required"
          : input.password.length > PASSWORD_MAX_LENGTH
            ? "password-too-long"
            : undefined,
    },
    { email, password: input.password },
  );
}

export function validateEmail(input: { email: string }): Validation<"email", string> {
  const email = input.email.trim();
  return result<"email", string>({ email: emailError(email) }, email);
}

export type NewPasswordField = "password" | "confirmation";

export function validateNewPassword(input: {
  password: string;
  confirmation: string;
}): Validation<NewPasswordField, string> {
  return result<NewPasswordField, string>(
    {
      password: passwordPolicyError(input.password),
      confirmation: input.confirmation === input.password ? undefined : "passwords-mismatch",
    },
    input.password,
  );
}
