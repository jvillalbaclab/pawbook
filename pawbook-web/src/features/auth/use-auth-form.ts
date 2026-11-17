"use client";

import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import type { FieldError } from "./form-fields";
import { apiFieldErrors, type ProblemMessage, problemMessage } from "./messages";
import type { FormErrors, Validation } from "./validation";

/*
 * Estado común de un formulario de acceso: valida en cliente con los esquemas del contrato,
 * envía con una mutación de TanStack Query y reparte el error de la API entre los campos
 * (`errors[]`) y el mensaje general (por `type` del problem).
 */

export function useAuthForm<Field extends string, Value, Result>(options: {
  validate: (data: FormData) => Validation<Field, Value>;
  submit: (value: Value) => Promise<Result>;
  onSuccess?: (result: Result, value: Value) => void;
  /** Ruta del contrato (`errors[].path`) → campo del formulario. */
  apiFields?: Readonly<Record<string, NoInfer<Field>>>;
  context?: "sign-in" | "default";
}) {
  const [localErrors, setLocalErrors] = useState<FormErrors<Field>>({});
  const mutation = useMutation({
    mutationFn: options.submit,
    onSuccess: options.onSuccess,
  });
  const serverErrors = apiFieldErrors(mutation.error, options.apiFields ?? {});

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    const result = options.validate(new FormData(event.currentTarget));
    if (!result.ok) {
      setLocalErrors(result.errors);
      mutation.reset();
      return;
    }
    setLocalErrors({});
    mutation.mutate(result.value);
  }

  function fieldError(field: Field): FieldError {
    const code = localErrors[field];
    if (code) return { code };
    const message = serverErrors[field];
    return message ? { message } : undefined;
  }

  // Si la API marcó campos concretos, el error ya se ve junto a ellos.
  const alert: ProblemMessage | null =
    mutation.error && Object.keys(serverErrors).length === 0
      ? problemMessage(mutation.error, options.context)
      : null;

  return {
    onSubmit,
    fieldError,
    alert,
    pending: mutation.isPending,
    succeeded: mutation.isSuccess,
    error: mutation.error,
  };
}
