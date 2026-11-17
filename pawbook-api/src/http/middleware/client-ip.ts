import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types";

/** Valor cuando el runtime no expone la IP (p. ej. `app.request` en tests sin `env`). */
export const UNKNOWN_IP = "unknown";

/*
 * IP de la conexión TCP según el runtime, sin importar adaptadores concretos:
 * - Bun.serve pasa el `Server` como `env`, con `requestIP(request)`.
 * - @hono/node-server pasa `{ incoming }`, un `IncomingMessage` con `socket.remoteAddress`.
 */
function socketAddress(env: unknown, request: Request): string | undefined {
  if (typeof env !== "object" || env === null) return undefined;
  if ("requestIP" in env && typeof env.requestIP === "function") {
    const info: unknown = env.requestIP(request);
    if (typeof info === "object" && info !== null && "address" in info) {
      return typeof info.address === "string" ? info.address : undefined;
    }
    return undefined;
  }
  if ("incoming" in env && typeof env.incoming === "object" && env.incoming !== null) {
    const incoming: { socket?: { remoteAddress?: unknown } } = env.incoming;
    const address = incoming.socket?.remoteAddress;
    return typeof address === "string" ? address : undefined;
  }
  return undefined;
}

/**
 * Elige la IP del cliente en `X-Forwarded-For` contando `trustedProxyHops` desde la derecha.
 * Cada proxy añade al final la IP de quien le conectó, así que solo las últimas entradas las
 * escribieron proxies nuestros; las de la izquierda las controla el cliente y se ignoran.
 */
export function pickForwardedIp(header: string, trustedProxyHops: number): string | undefined {
  const entries = header
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (entries.length < trustedProxyHops) return undefined;
  return entries[entries.length - trustedProxyHops];
}

/**
 * Resuelve la IP del cliente y la deja en `c.var.clientIp`. Por defecto (`trustedProxyHops = 0`)
 * ignora `X-Forwarded-For`: cualquiera puede enviarla y falsificar su IP para esquivar el
 * rate limit. Solo se activa cuando la configuración declara proxies de confianza delante.
 */
export function clientIp(options: { trustedProxyHops: number }) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const forwarded = c.req.header("x-forwarded-for");
    const fromProxy =
      options.trustedProxyHops > 0 && forwarded !== undefined
        ? pickForwardedIp(forwarded, options.trustedProxyHops)
        : undefined;
    c.set("clientIp", fromProxy ?? socketAddress(c.env, c.req.raw) ?? UNKNOWN_IP);
    await next();
  });
}
