"use client";

import { useEffect, useRef, useState } from "react";
import { createHandleChecker, type HandleStatus } from "./create-pet";
import { checkHandleAvailability } from "./pets-api";

/** Estado de disponibilidad del @handle mientras se escribe (ver createHandleChecker). */
export function useHandleAvailability(handle: string): HandleStatus {
  const [status, setStatus] = useState<HandleStatus>({ kind: "idle" });
  const checkerRef = useRef<ReturnType<typeof createHandleChecker> | null>(null);

  useEffect(() => {
    const checker = createHandleChecker({ check: checkHandleAvailability, onStatus: setStatus });
    checkerRef.current = checker;
    return () => {
      checker.dispose();
      checkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    checkerRef.current?.update(handle);
  }, [handle]);

  return status;
}
