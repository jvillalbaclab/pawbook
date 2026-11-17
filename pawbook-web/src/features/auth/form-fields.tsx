"use client";

import { useTranslations } from "next-intl";
import type { InputHTMLAttributes, ReactNode } from "react";
import { FIELD_ERROR_KEYS, FIELD_ERROR_VALUES, type ProblemMessage } from "./messages";
import type { FieldErrorCode } from "./validation";

/*
 * Piezas comunes de los formularios de acceso, con el estilo del registro (Onb-Registro):
 * etiqueta en negrita, campo de 48 px con borde, error en rojo bajo el campo enlazado con
 * aria-describedby, y botón principal de 52 px.
 */

/** Error de un campo: un código de validación local (catálogo) o un texto de la API. */
export type FieldError = { code: FieldErrorCode } | { message: string } | undefined;

export function FieldErrorText({ id, error }: { id: string; error: FieldError }) {
  const t = useTranslations("auth");
  if (!error) return null;
  return (
    <p id={id} className="text-[13px] font-semibold text-danger-ink">
      {"code" in error ? t(FIELD_ERROR_KEYS[error.code], FIELD_ERROR_VALUES) : error.message}
    </p>
  );
}

const INPUT_CLASSES =
  "h-12 rounded-control border bg-surface px-3.5 text-base text-ink outline-none placeholder:text-muted focus:border-ink-2";

type TextFieldProps = {
  name: string;
  label: string;
  error: FieldError;
  hint?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "className">;

export function TextField({ name, label, error, hint, ...input }: TextFieldProps) {
  const errorId = `${name}-error`;
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-bold text-ink">
      {label}
      <input
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={`${INPUT_CLASSES} ${error ? "border-danger-ink" : "border-line-strong"}`}
        {...input}
      />
      {hint && !error ? <span className="text-xs font-normal text-muted">{hint}</span> : null}
      <FieldErrorText id={errorId} error={error} />
    </label>
  );
}

/** Mensaje general del formulario (error de la API); se anuncia a lectores de pantalla. */
export function FormAlert({ message }: { message: ProblemMessage | null }) {
  const t = useTranslations("auth");
  if (message === null) return null;
  return (
    <p
      role="alert"
      className="rounded-control border border-danger-ink/30 bg-danger-tint px-3.5 py-2.5 text-[13px] font-semibold text-danger-ink"
    >
      {t(message.key, message.values ?? { seconds: 0 })}
    </p>
  );
}

/** Aviso neutro de éxito o información (p. ej. "te hemos enviado un enlace"). */
export function FormNotice({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="rounded-control border border-line bg-surface-2 px-3.5 py-2.5 text-[13px] text-ink-2"
    >
      {children}
    </p>
  );
}

export const PRIMARY_BUTTON_CLASSES =
  "flex h-[52px] items-center justify-center rounded-2xl bg-primary px-6 text-[15px] font-bold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60";

export const SECONDARY_BUTTON_CLASSES =
  "flex h-[52px] items-center justify-center gap-2.5 rounded-2xl border border-line-strong bg-surface px-6 text-[15px] font-bold text-ink hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60";

export function SubmitButton({
  pending,
  label,
  pendingLabel,
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
}) {
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={PRIMARY_BUTTON_CLASSES}>
      {pending ? pendingLabel : label}
    </button>
  );
}
