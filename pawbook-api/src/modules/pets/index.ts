/*
 * API pública del módulo pets para el resto de módulos (§4.2). Otros módulos reaccionan a sus
 * eventos y leen lo que necesitan de una mascota mediante puertos propios que la composición
 * conecta con los casos de uso de aquí (p. ej. social → `PetSocialProfile` para Stream). La
 * mascota activa se valida con el middleware transversal `src/http/middleware/active-pet.ts`.
 */
export type { PetSocialProfile } from "./application/pets";
export type { PetArchived, PetCreated, PetEvent, PetField, PetUpdated } from "./domain/events";
