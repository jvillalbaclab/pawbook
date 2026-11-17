import type { Messages } from "./messages";

// Claves de traducción tipadas: una clave inexistente es un error de TypeScript.
declare module "next-intl" {
  interface AppConfig {
    Messages: Messages;
  }
}
