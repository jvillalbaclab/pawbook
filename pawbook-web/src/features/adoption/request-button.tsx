"use client";

import { useState } from "react";
import type { AdoptionStatus } from "@/lib/types";

/**
 * Botón de solicitud (US-42). Sin API todavía no envía nada: lo dice claramente
 * en vez de mostrar un "enviado" falso.
 */
export function RequestButton({
  status,
  organizationName,
}: {
  status: AdoptionStatus;
  organizationName: string;
}) {
  const [pressed, setPressed] = useState(false);

  if (status === "adopted") {
    return (
      <p className="rounded-2xl bg-surface-2 p-3 text-center text-sm font-semibold text-ink-2">
        Ya fue adoptado.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pressed}
        onClick={() => setPressed(true)}
        className="h-[50px] rounded-2xl bg-success text-[15px] font-bold text-white disabled:opacity-60"
      >
        Solicitar adopción
      </button>
      <p role="status" className="text-center text-xs text-muted">
        {pressed
          ? "Enviar solicitudes estará disponible cuando conectemos la API."
          : `La solicitud llega a ${organizationName} por chat y correo.`}
      </p>
    </div>
  );
}
