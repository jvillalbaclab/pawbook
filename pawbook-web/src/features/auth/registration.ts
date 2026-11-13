export type RegistrationInput = {
  email: string;
  password: string;
  acceptedTerms: boolean;
};

export type RegistrationErrors = Partial<Record<keyof RegistrationInput, string>>;

export const MIN_PASSWORD_LENGTH = 8;

// Comprobación básica en cliente; la verificación real es el enlace por correo (FR-AUTH-002).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Valida el formulario de registro; devuelve un objeto vacío si todo es correcto. */
export function validateRegistration(input: RegistrationInput): RegistrationErrors {
  const errors: RegistrationErrors = {};
  if (!EMAIL_PATTERN.test(input.email.trim())) {
    errors.email = "Escribe un correo válido, por ejemplo nombre@correo.com.";
  }
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `La contraseña necesita al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (!input.acceptedTerms) {
    errors.acceptedTerms = "Debes confirmar la edad mínima y aceptar los términos.";
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
