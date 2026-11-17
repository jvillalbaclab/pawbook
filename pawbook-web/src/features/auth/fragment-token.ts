"use client";

import { useEffect, useRef, useState } from "react";

/** Token de un enlace de correo: `#token=…` (en el fragmento, nunca en la query). */
export function tokenFromHash(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("token");
  return token && token.length > 0 ? token : null;
}

/**
 * Lee una sola vez el token del fragmento de la URL y lo borra de la barra de direcciones
 * (y del historial), para que no quede a la vista ni se comparta al copiar el enlace.
 * `undefined` mientras no se ha leído (prerenderizado e hidratación); `null` si no hay.
 */
export function useFragmentToken(): string | null | undefined {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const read = useRef(false);

  useEffect(() => {
    // En modo estricto el efecto corre dos veces; la segunda ya no vería el fragmento.
    if (read.current) return;
    read.current = true;
    const found = tokenFromHash(window.location.hash);
    if (found !== null) {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
    setToken(found);
  }, []);

  return token;
}
