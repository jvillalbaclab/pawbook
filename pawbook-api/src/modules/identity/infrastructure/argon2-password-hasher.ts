import { argon2id, argon2Verify } from "hash-wasm";
import type { PasswordHasher } from "../application/ports";

/*
 * Argon2id (NFR-SEC-002) con los parámetros mínimos de OWASP: 19 MiB, 2 iteraciones, 1 hilo.
 * El resultado es una cadena PHC (`$argon2id$v=19$m=19456,t=2,p=1$...`) que lleva sus
 * parámetros, así que subirlos más adelante no invalida los hashes existentes.
 *
 * - En Bun (la imagen de producción) usa `Bun.password`: nativo y fuera del hilo principal.
 * - En Node 22 usa `hash-wasm`: WebAssembly puro, sin binarios nativos, así el bundle de
 *   `bun build --target=node` sigue siendo autocontenido. Bloquea el event loop unas decenas
 *   de milisegundos por hash; es aceptable como alternativa (CON-TECH-002).
 * Ambos producen y aceptan el mismo formato PHC (lo comprueba el test del adaptador).
 */
export const ARGON2ID_PARAMS = { memoryKiB: 19_456, iterations: 2, parallelism: 1 } as const;

const HASH_LENGTH = 32;
const SALT_LENGTH = 16;

export type Argon2Engine = "bun" | "wasm";

export class Argon2idPasswordHasher implements PasswordHasher {
  readonly engine: Argon2Engine;

  constructor(engine: Argon2Engine = typeof Bun !== "undefined" ? "bun" : "wasm") {
    this.engine = engine;
  }

  async hash(password: string): Promise<string> {
    if (this.engine === "bun") {
      return Bun.password.hash(password, {
        algorithm: "argon2id",
        memoryCost: ARGON2ID_PARAMS.memoryKiB,
        timeCost: ARGON2ID_PARAMS.iterations,
      });
    }
    return argon2id({
      password,
      salt: crypto.getRandomValues(new Uint8Array(SALT_LENGTH)),
      memorySize: ARGON2ID_PARAMS.memoryKiB,
      iterations: ARGON2ID_PARAMS.iterations,
      parallelism: ARGON2ID_PARAMS.parallelism,
      hashLength: HASH_LENGTH,
      outputType: "encoded",
    });
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    // Solo se aceptan hashes Argon2id: un formato inesperado es un fallo, nunca un acierto.
    if (!passwordHash.startsWith("$argon2id$")) return false;
    try {
      if (this.engine === "bun") return await Bun.password.verify(password, passwordHash);
      return await argon2Verify({ password, hash: passwordHash });
    } catch {
      return false;
    }
  }
}
