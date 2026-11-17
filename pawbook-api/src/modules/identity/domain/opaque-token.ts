/*
 * Tokens opacos de un solo uso (refresh, verificación de correo, recuperación de contraseña).
 * Al cliente se le entrega el valor; en la base de datos solo se guarda su SHA-256, así una
 * fuga de la tabla no permite usar ningún token. Con 256 bits aleatorios no hace falta sal
 * ni un hash lento: no se pueden adivinar por fuerza bruta.
 */

const TOKEN_BYTES = 32;

export function generateOpaqueToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  return Buffer.from(bytes).toString("base64url");
}

export async function hashOpaqueToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Buffer.from(digest).toString("hex");
}
