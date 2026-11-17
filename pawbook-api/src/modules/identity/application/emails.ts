import type { EmailMessage } from "../../../shared/email";

/*
 * Plantillas de los correos de identity. El token va en el fragmento (`#token=`) y no en la
 * query: el navegador no envía el fragmento al servidor, así que no acaba en logs de acceso,
 * de CDN ni en la cabecera Referer. La web lo lee y lo manda por POST a la API.
 */

function link(webAppUrl: string, path: string, token: string): string {
  const url = new URL(path, webAppUrl);
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}

export function verificationEmail(to: string, token: string, webAppUrl: string): EmailMessage {
  return {
    to,
    template: "identity.verify-email",
    subject: "Confirma tu correo en PawBook",
    text: [
      "¡Hola!",
      "",
      "Para terminar de crear tu cuenta en PawBook, confirma tu correo con este enlace:",
      link(webAppUrl, "/verificar-correo", token),
      "",
      "El enlace caduca en 24 horas. Si no creaste esta cuenta, ignora este mensaje.",
    ].join("\n"),
  };
}

/** Se envía si alguien intenta registrarse con un correo que ya tiene cuenta (§9). */
export function accountExistsEmail(to: string, webAppUrl: string): EmailMessage {
  return {
    to,
    template: "identity.account-exists",
    subject: "Ya tienes una cuenta en PawBook",
    text: [
      "¡Hola!",
      "",
      "Alguien (quizá tú) intentó crear una cuenta en PawBook con este correo, pero ya existe una.",
      `Puedes iniciar sesión en ${new URL("/entrar", webAppUrl).toString()} o recuperar tu contraseña desde allí.`,
      "",
      "Si no fuiste tú, no tienes que hacer nada.",
    ].join("\n"),
  };
}

export function passwordResetEmail(to: string, token: string, webAppUrl: string): EmailMessage {
  return {
    to,
    template: "identity.password-reset",
    subject: "Restablece tu contraseña de PawBook",
    text: [
      "¡Hola!",
      "",
      "Recibimos una solicitud para restablecer tu contraseña. Usa este enlace:",
      link(webAppUrl, "/restablecer-contrasena", token),
      "",
      "El enlace sirve una sola vez y caduca en 1 hora. Si no lo pediste, ignora este mensaje: tu contraseña no cambia.",
    ].join("\n"),
  };
}
