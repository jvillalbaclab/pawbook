import type { Transaction } from "./unit-of-work";

/*
 * Inbox (arquitectura §8): deduplica lo que llega de fuera (webhooks de Stream, eventos del
 * outbox reentregados por pg-boss). Cada fuente reintenta a su manera; aquí se garantiza que
 * el efecto se aplica una sola vez.
 */

export type ProcessOnceResult<T> =
  | { readonly processed: true; readonly value: T }
  | { readonly processed: false };

export interface Inbox {
  /**
   * Ejecuta `fn` solo si `(source, externalId)` no se procesó antes. El registro en el inbox y
   * lo que `fn` escriba con `tx` se confirman juntos: si `fn` lanza, no queda marca y el
   * siguiente reintento vuelve a ejecutarlo.
   */
  processOnce<T>(
    source: string,
    externalId: string,
    fn: (tx: Transaction) => Promise<T>,
  ): Promise<ProcessOnceResult<T>>;
}
