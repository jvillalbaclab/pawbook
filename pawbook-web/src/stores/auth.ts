import type { Me } from "@pawbook/contracts";
import { create } from "zustand";

/*
 * Estado de la sesión que necesita la interfaz: si hay sesión y de quién. El access token
 * NO está aquí (vive solo dentro de @/lib/api-client/session) y nada se persiste: tras
 * recargar, el estado vuelve a "unknown" hasta que el refresh con la cookie responde.
 */

export type AuthStatus = "unknown" | "authenticated" | "anonymous";

type AuthState = {
  status: AuthStatus;
  user: Me | null;
  setUser: (user: Me | null) => void;
};

export const useAuthStore = create<AuthState>()((set) => ({
  status: "unknown",
  user: null,
  setUser: (user) => set({ user, status: user === null ? "anonymous" : "authenticated" }),
}));
