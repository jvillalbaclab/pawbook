import {
  type CreatePetRequest,
  type HandleAvailability,
  PET_HANDLE_PATTERN,
  PET_NAME_MAX_LENGTH,
  PET_SHORT_TEXT_MAX_LENGTH,
} from "@pawbook/contracts";
import { isApiError } from "@/lib/api-client/problem";

/*
 * Lógica del paso 2 del onboarding (FR-PET-001/002), sin React para probarla sola:
 * disponibilidad del @handle con debounce y cancelación, Idempotency-Key por intento de envío
 * y reparto de los errores de la API entre los campos del formulario.
 */

// ------------------------------------------------------------------------------ handle

/** Como lo guarda la API: sin `@` inicial, sin espacios alrededor y en minúsculas. */
export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

/**
 * Validación local del formato (la misma que la API): `PET_HANDLE_PATTERN` y al menos una
 * letra o un dígito. Los handles reservados solo los conoce el servidor.
 */
export function isHandleFormatValid(handle: string): boolean {
  return PET_HANDLE_PATTERN.test(handle) && /[a-z0-9]/.test(handle);
}

export type HandleStatus =
  | { kind: "idle" }
  | { kind: "checking"; handle: string }
  | { kind: "available"; handle: string }
  | { kind: "taken"; handle: string }
  | { kind: "reserved"; handle: string }
  | { kind: "invalid"; handle: string }
  /** No se pudo comprobar (red, 429…): el envío decidirá. */
  | { kind: "unknown"; handle: string };

export function statusFromAvailability(result: HandleAvailability): HandleStatus {
  if (result.available) return { kind: "available", handle: result.handle };
  return { kind: result.reason ?? "taken", handle: result.handle };
}

export type HandleCheckerOptions = {
  check: (handle: string, signal: AbortSignal) => Promise<HandleAvailability>;
  onStatus: (status: HandleStatus) => void;
  delayMs?: number;
  schedule?: (work: () => void, ms: number) => () => void;
};

export const HANDLE_CHECK_DELAY_MS = 400;

const defaultSchedule = (work: () => void, ms: number) => {
  const timer = setTimeout(work, ms);
  return () => clearTimeout(timer);
};

/**
 * Comprueba la disponibilidad mientras se escribe: espera a que se deje de teclear
 * (`delayMs`), cancela la solicitud anterior al cambiar el texto y descarta respuestas que
 * no corresponden al handle actual. Un formato no válido se resuelve sin llamar a la API.
 */
export function createHandleChecker(options: HandleCheckerOptions) {
  const delayMs = options.delayMs ?? HANDLE_CHECK_DELAY_MS;
  const schedule = options.schedule ?? defaultSchedule;
  let current = "";
  let cancelTimer: (() => void) | null = null;
  let inFlight: AbortController | null = null;

  function cancel(): void {
    cancelTimer?.();
    cancelTimer = null;
    inFlight?.abort();
    inFlight = null;
  }

  async function run(handle: string): Promise<void> {
    const controller = new AbortController();
    inFlight = controller;
    try {
      const result = await options.check(handle, controller.signal);
      if (controller.signal.aborted || handle !== current) return;
      options.onStatus(statusFromAvailability(result));
    } catch {
      if (controller.signal.aborted || handle !== current) return;
      options.onStatus({ kind: "unknown", handle });
    } finally {
      if (inFlight === controller) inFlight = null;
    }
  }

  return {
    /** Nuevo valor del campo (ya normalizado). */
    update(handle: string): void {
      if (handle === current) return;
      current = handle;
      cancel();
      if (handle === "") {
        options.onStatus({ kind: "idle" });
        return;
      }
      if (!isHandleFormatValid(handle)) {
        options.onStatus({ kind: "invalid", handle });
        return;
      }
      options.onStatus({ kind: "checking", handle });
      cancelTimer = schedule(() => {
        cancelTimer = null;
        void run(handle);
      }, delayMs);
    },
    dispose: cancel,
  };
}

// ----------------------------------------------------------------- Idempotency-Key

/**
 * Una Idempotency-Key por intento de envío: los reenvíos del MISMO formulario (doble clic,
 * reintento tras un fallo de red) reutilizan la clave y la API devuelve la mascota ya creada
 * en vez de crear otra. Si el usuario cambia algún dato, es otro intento y lleva clave nueva
 * (la API rechaza reutilizar una clave con otro cuerpo).
 */
export function createIdempotencyKeys(generate: () => string = () => crypto.randomUUID()) {
  let last: { payload: string; key: string } | null = null;
  return {
    keyFor(request: CreatePetRequest): string {
      const payload = JSON.stringify(request);
      if (last?.payload !== payload) last = { payload, key: generate() };
      return last.key;
    },
  };
}

// --------------------------------------------------------------------- formulario

export type PetFormValues = {
  name: string;
  handle: string;
  species: CreatePetRequest["species"];
  sex: CreatePetRequest["sex"];
  /** Raza ya resuelta a texto (catálogo traducido o texto libre); vacía = sin raza. */
  breed: string;
  /** `AAAA-MM` del `<input type="month">`, o vacío. */
  birthMonth: string;
};

export type PetField = "name" | "handle" | "breed" | "birthMonth";

/** Claves de `petStep.errors` del catálogo. */
export type PetFieldError =
  | "nameRequired"
  | "nameTooLong"
  | "handleInvalid"
  | "handleTaken"
  | "handleReserved"
  | "handleRejected"
  | "breedTooLong"
  | "birthMonthInvalid"
  | "fieldInvalid";

export type PetFormAlert =
  | "petLimit"
  | "network"
  | "rateLimited"
  | "validation"
  | "unavailable"
  | "generic";

export type PetFormErrors = {
  fields: Partial<Record<PetField, PetFieldError>>;
  alert: PetFormAlert | null;
};

const BIRTH_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Valida en cliente y arma el cuerpo de `POST /v1/pets`. */
export function buildCreatePetRequest(
  values: PetFormValues,
): { ok: true; request: CreatePetRequest } | { ok: false; errors: PetFormErrors } {
  const fields: PetFormErrors["fields"] = {};
  const name = values.name.trim();
  const handle = normalizeHandle(values.handle);
  const breed = values.breed.trim();
  if (name === "") fields.name = "nameRequired";
  else if (name.length > PET_NAME_MAX_LENGTH) fields.name = "nameTooLong";
  if (!isHandleFormatValid(handle)) fields.handle = "handleInvalid";
  if (breed.length > PET_SHORT_TEXT_MAX_LENGTH) fields.breed = "breedTooLong";
  if (values.birthMonth !== "" && !BIRTH_MONTH.test(values.birthMonth)) {
    fields.birthMonth = "birthMonthInvalid";
  }
  if (Object.keys(fields).length > 0) return { ok: false, errors: { fields, alert: null } };
  return {
    ok: true,
    request: {
      handle,
      name,
      species: values.species,
      sex: values.sex,
      breed: breed === "" ? null : breed,
      birthMonth: values.birthMonth === "" ? null : values.birthMonth,
    },
  };
}

/** Rutas del contrato (`errors[].path`) que el formulario pinta junto a un campo. */
const FIELD_OF: Readonly<Record<string, PetField>> = {
  name: "name",
  handle: "handle",
  breed: "breed",
  birthMonth: "birthMonth",
};

/**
 * Reparte un error de `POST /v1/pets` entre los campos y el aviso general. El texto siempre
 * sale del catálogo (se decide por estado, `type` y campo, nunca por el mensaje de la API):
 * - 409 con error en `handle`: ocupado (otro lo registró entretanto). 409 sin campo: límite.
 * - 422 en `handle`: reservado o con formato no válido (la API no los distingue por código).
 */
export function mapCreatePetError(error: unknown): PetFormErrors {
  if (!isApiError(error)) return { fields: {}, alert: "generic" };
  const fields: PetFormErrors["fields"] = {};
  for (const path of Object.keys(error.fieldErrors)) {
    const field = FIELD_OF[path];
    if (field === undefined) continue;
    if (field === "handle") fields.handle = error.status === 409 ? "handleTaken" : "handleRejected";
    else fields[field] = "fieldInvalid";
  }
  if (Object.keys(fields).length > 0) return { fields, alert: null };
  switch (error.code) {
    case "conflict":
      return { fields, alert: "petLimit" };
    case "network-error":
      return { fields, alert: "network" };
    case "rate-limited":
      return { fields, alert: "rateLimited" };
    case "validation-failed":
      return { fields, alert: "validation" };
    case "service-unavailable":
      return { fields, alert: "unavailable" };
    default:
      return { fields, alert: "generic" };
  }
}

/** Error de campo que corresponde al estado de disponibilidad (bloquea el envío). */
export function handleStatusError(status: HandleStatus): PetFieldError | null {
  switch (status.kind) {
    case "taken":
      return "handleTaken";
    case "reserved":
      return "handleReserved";
    case "invalid":
      return "handleInvalid";
    default:
      return null;
  }
}
