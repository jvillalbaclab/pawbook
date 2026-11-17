/*
 * @pawbook/contracts: esquemas Zod compartidos entre la API, la web y (si es Expo) la app
 * móvil. Las rutas de la API los usan para validar y para generar el OpenAPI, así que nada
 * se define dos veces (principio 4 de la arquitectura).
 */
export * from "./idempotency";
export * from "./identity";
export * from "./pagination";
export * from "./pets";
export * from "./problem";
export * from "./stream";
export * from "./system";
