import { StreamClient } from "@stream-io/node-sdk";
import type { RealtimeTokenPort } from "../application/ports";

/*
 * Tokens de usuario de Stream con el SDK oficial de servidor (SW-002). `generateUserToken` firma
 * un JWT HS256 con el secreto de la app en local: no hace ninguna llamada a la red, así que puede
 * funcionar antes del spike de GetStream (T-SP.*) con solo api key + secret. Construir el
 * `StreamClient` tampoco llama a la red.
 */
export class StreamRealtimeTokens implements RealtimeTokenPort {
  readonly apiKey: string;
  readonly #client: StreamClient;

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.#client = new StreamClient(apiKey, apiSecret);
  }

  userToken(streamUserId: string, issuedAt: Date, expiresAt: Date): string {
    return this.#client.generateUserToken({
      user_id: streamUserId,
      iat: Math.floor(issuedAt.getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    });
  }
}
