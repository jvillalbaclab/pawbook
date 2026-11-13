"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { type RegistrationErrors, validateRegistration } from "./registration";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-[13px] font-semibold text-danger-ink">
      {message}
    </p>
  );
}

export function RegistrationForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<RegistrationErrors>({});

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const found = validateRegistration({
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      acceptedTerms: data.get("terms") === "on",
    });
    setErrors(found);
    // Sin API todavía: si el formulario es válido, el prototipo pasa al siguiente paso.
    if (Object.keys(found).length === 0) router.push("/registro/mascota");
  }

  const input =
    "h-12 rounded-[14px] border bg-surface px-3.5 text-base text-ink outline-none placeholder:text-muted focus:border-ink-2";

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        className="flex h-[52px] items-center justify-center gap-2.5 rounded-2xl border border-line-strong bg-surface text-[15px] font-bold text-ink"
      >
        <span
          aria-hidden="true"
          className="flex size-6 items-center justify-center rounded-full border-[1.5px] border-ink text-[13px] font-extrabold"
        >
          G
        </span>
        Continuar con Google
      </button>
      <div className="flex items-center gap-2.5 text-[13px] text-muted">
        <span className="h-px flex-1 bg-line" />o con tu correo
        <span className="h-px flex-1 bg-line" />
      </div>

      <form noValidate onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-bold text-ink">
          Correo electrónico
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby="email-error"
            className={`${input} ${errors.email ? "border-danger-ink" : "border-line-strong"}`}
          />
          <FieldError id="email-error" message={errors.email} />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-bold text-ink">
          Contraseña
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            aria-invalid={Boolean(errors.password)}
            aria-describedby="password-error"
            className={`${input} ${errors.password ? "border-danger-ink" : "border-line-strong"}`}
          />
          <FieldError id="password-error" message={errors.password} />
        </label>
        <label className="flex items-start gap-2.5 text-[13px] leading-snug text-ink-2">
          <input
            name="terms"
            type="checkbox"
            aria-invalid={Boolean(errors.acceptedTerms)}
            aria-describedby="terms-error"
            className="mt-0.5 size-5 shrink-0 accent-primary"
          />
          <span>
            Confirmo que tengo [EDAD MÍNIMA] años o más y acepto los{" "}
            <Link href="#" className="font-semibold text-primary-ink">
              Términos
            </Link>{" "}
            y la{" "}
            <Link href="#" className="font-semibold text-primary-ink">
              Política de privacidad
            </Link>
            .
          </span>
        </label>
        <FieldError id="terms-error" message={errors.acceptedTerms} />
        <button
          type="submit"
          className="h-[52px] rounded-2xl bg-primary text-[15px] font-bold text-white hover:bg-primary-hover"
        >
          Crear cuenta
        </button>
        <p className="text-center text-xs text-muted">
          Te enviaremos un enlace para verificar tu correo antes de publicar.
        </p>
      </form>
    </div>
  );
}
