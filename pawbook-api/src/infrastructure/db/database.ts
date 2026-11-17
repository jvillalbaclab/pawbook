import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type postgres from "postgres";
import type { Transaction, UnitOfWork } from "../../shared/unit-of-work";

/*
 * Instancia de Drizzle sobre el cliente `postgres` que ya crea la composición (un solo pool).
 * Ojo: Drizzle ajusta los serializadores del cliente al envolverlo (fechas y JSON pasan tal
 * cual, Drizzle los convierte él mismo), así que el SQL crudo hecho con ese mismo cliente
 * recibe las fechas como texto.
 */
export type Database = PostgresJsDatabase;

export type DbTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export function createDatabase(sql: postgres.Sql): Database {
  return drizzle({ client: sql });
}

// Token opaco → transacción real. Se borra al terminar `run` para detectar usos tardíos.
const openTransactions = new WeakMap<Transaction, DbTransaction>();

/** Para adaptadores Drizzle (repositorios, outbox, inbox): recupera la transacción del token. */
export function dbTransaction(tx: Transaction): DbTransaction {
  const dbTx = openTransactions.get(tx);
  if (dbTx === undefined) {
    throw new Error("La transacción ya terminó o no la creó DrizzleUnitOfWork");
  }
  return dbTx;
}

export class DrizzleUnitOfWork implements UnitOfWork {
  constructor(private readonly db: Database) {}

  run<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.db.transaction(async (dbTx) => {
      const token = Object.freeze({}) as Transaction;
      openTransactions.set(token, dbTx);
      try {
        return await work(token);
      } finally {
        openTransactions.delete(token);
      }
    });
  }
}
