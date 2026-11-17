export type RegistrationInput = {
  email: string;
  password: string;
  acceptedTerms: boolean;
};

/** Código de error de cada campo; la interfaz lo traduce con el catálogo. */
export type RegistrationErrorCode = "invalid-email" | "password-too-short" | "terms-required";

export type RegistrationErrors = Partial<Record<keyof RegistrationInput, RegistrationErrorCode>>;

export const MIN_PASSWORD_LENGTH = 8;

/** Meta del PRD: seguir al menos 5 mascotas para llenar el feed (objetivo "Red"). */
export const FOLLOW_TARGET = 5;

// Comprobación básica en cliente; la verificación real es el enlace por correo (FR-AUTH-002).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Valida el formulario de registro; devuelve los códigos de error, o un objeto vacío si todo es correcto. */
export function validateRegistration(input: RegistrationInput): RegistrationErrors {
  const errors: RegistrationErrors = {};
  if (!EMAIL_PATTERN.test(input.email.trim())) {
    errors.email = "invalid-email";
  }
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = "password-too-short";
  }
  if (!input.acceptedTerms) {
    errors.acceptedTerms = "terms-required";
  }
  return errors;
}

/** Un @handle válido: 3 a 30 caracteres, minúsculas, números, punto o guion bajo. */
export function isValidHandle(handle: string): boolean {
  return /^[a-z0-9._]{3,30}$/.test(handle);
}

/** Convierte un nombre en un @handle sugerido: minúsculas, sin tildes ni espacios. */
export function suggestHandle(name: string, species: "dog" | "cat"): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
  if (!base) return "";
  return `${base}.${species === "cat" ? "gato" : "perro"}`;
}
