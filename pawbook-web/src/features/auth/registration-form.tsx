"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import {
  MIN_PASSWORD_LENGTH,
  type RegistrationErrorCode,
  type RegistrationErrors,
  validateRegistration,
} from "./registration";

/** Clave del catálogo (namespace "registration") para cada código de error. */
const ERROR_KEYS = {
  "invalid-email": "errors.invalidEmail",
  "password-too-short": "errors.passwordTooShort",
  "terms-required": "errors.termsRequired",
} as const satisfies Record<RegistrationErrorCode, string>;

function FieldError({ id, code }: { id: string; code?: RegistrationErrorCode }) {
  const t = useTranslations("registration");
  if (!code) return null;
  return (
    <p id={id} className="text-[13px] font-semibold text-danger-ink">
      {t(ERROR_KEYS[code], { min: MIN_PASSWORD_LENGTH })}
    </p>
  );
}

export function RegistrationForm() {
  const t = useTranslations("registration");
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
    "h-12 rounded-control border bg-surface px-3.5 text-base text-ink outline-none placeholder:text-muted focus:border-ink-2";

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
        {t("google")}
      </button>
      <div className="flex items-center gap-2.5 text-[13px] text-muted">
        <span className="h-px flex-1 bg-line" />
        {t("orEmail")}
        <span className="h-px flex-1 bg-line" />
      </div>

      <form noValidate onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-bold text-ink">
          {t("email")}
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            aria-invalid={Boolean(errors.email)}
            aria-describedby="email-error"
            className={`${input} ${errors.email ? "border-danger-ink" : "border-line-strong"}`}
          />
          <FieldError id="email-error" code={errors.email} />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-bold text-ink">
          {t("password")}
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder={t("passwordPlaceholder", { min: MIN_PASSWORD_LENGTH })}
            aria-invalid={Boolean(errors.password)}
            aria-describedby="password-error"
            className={`${input} ${errors.password ? "border-danger-ink" : "border-line-strong"}`}
          />
          <FieldError id="password-error" code={errors.password} />
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
            {t.rich("terms", {
              terms: (chunks) => (
                <Link href="#" className="font-semibold text-primary-ink">
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link href="#" className="font-semibold text-primary-ink">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>
        <FieldError id="terms-error" code={errors.acceptedTerms} />
        <button
          type="submit"
          className="h-[52px] rounded-2xl bg-primary text-[15px] font-bold text-white hover:bg-primary-hover"
        >
          {t("submit")}
        </button>
        <p className="text-center text-xs text-muted">{t("verifyNotice")}</p>
      </form>
    </div>
  );
}
