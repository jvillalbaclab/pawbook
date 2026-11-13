/*
 * Resultado explícito para errores de negocio esperados (handle ocupado, límite de
 * mascotas...). Las excepciones quedan para lo inesperado; así el compilador obliga a
 * los casos de uso a tratar cada fallo previsto.
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
