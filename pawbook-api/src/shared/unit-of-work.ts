/*
 * Transacciones vistas desde los casos de uso. `Transaction` es un token opaco: el caso de uso
 * lo recibe de `UnitOfWork.run` y lo pasa a cada puerto que deba escribir de forma atómica
 * (repositorios, `EventOutbox`, `Inbox`). Solo el adaptador sabe qué hay detrás (hoy, una
 * transacción de Drizzle), así que application y domain no importan nada de infraestructura.
 *
 *   await uow.run(async (tx) => {
 *     await matches.save(tx, match);
 *     await outbox.enqueue(tx, [matchCreated]);
 *   });
 */

declare const transactionBrand: unique symbol;

export interface Transaction {
  readonly [transactionBrand]: "Transaction";
}

export interface UnitOfWork {
  /**
   * Ejecuta `work` en una transacción nueva: confirma si resuelve y hace rollback si lanza.
   * Usar el token fuera de `work` (después de confirmar) es un error de programación y lanza.
   */
  run<T>(work: (tx: Transaction) => Promise<T>): Promise<T>;
}
