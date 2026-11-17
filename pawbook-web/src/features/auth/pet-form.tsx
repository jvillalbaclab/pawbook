"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { ImageIcon } from "@/design-system/icons";
import type { Sex, Species } from "@/lib/types";
import { isValidHandle, suggestHandle } from "./registration";

/** Razas frecuentes por especie (claves de "petStep.breeds"). */
const BREEDS = {
  cat: ["mixed", "european", "siamese", "persian", "maineCoon", "unknown"],
  dog: ["mixed", "labrador", "borderCollie", "beagle", "poodle", "unknown"],
} as const satisfies Record<Species, readonly string[]>;

type FormError = "nameRequired" | "handleInvalid";

/** Paso 2: presentar a la mascota (US-02). El @handle se sugiere hasta que se edita a mano. */
export function PetForm() {
  const t = useTranslations("petStep");
  const tPets = useTranslations("pets");
  const router = useRouter();
  const [species, setSpecies] = useState<Species>("cat");
  const [sex, setSex] = useState<Sex>("female");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [error, setError] = useState<FormError | null>(null);

  const shownHandle = handleTouched ? handle : suggestHandle(name, species);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError("nameRequired");
    if (!isValidHandle(shownHandle)) return setError("handleInvalid");
    router.push("/registro/seguir");
  }

  const segment = (active: boolean) =>
    `h-14 rounded-2xl text-[15px] ${active ? "border-2 border-ink font-extrabold text-ink" : "border border-line-strong font-semibold text-ink-2"} bg-surface`;
  const field =
    "h-12 rounded-control border border-line-strong bg-surface px-3.5 text-base text-ink outline-none focus:border-ink-2";

  return (
    <form noValidate onSubmit={submit} className="flex flex-1 flex-col gap-4">
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          aria-label={t("addPhoto")}
          className="flex size-[84px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-full border-2 border-dashed border-line-strong bg-surface text-[11px] font-bold text-muted"
        >
          <ImageIcon size={24} />
          {t("photo")}
        </button>
        <fieldset className="grid flex-1 grid-cols-2 gap-2">
          <legend className="mb-1.5 text-[13px] font-bold text-ink">{t("species")}</legend>
          <button
            type="button"
            aria-pressed={species === "dog"}
            onClick={() => setSpecies("dog")}
            className={segment(species === "dog")}
          >
            {tPets("species.dog")}
          </button>
          <button
            type="button"
            aria-pressed={species === "cat"}
            onClick={() => setSpecies("cat")}
            className={segment(species === "cat")}
          >
            {tPets("species.cat")}
          </button>
        </fieldset>
      </div>

      <label className="flex flex-col gap-1.5 text-[13px] font-bold text-ink">
        {t("name")}
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={field}
          placeholder={t("namePlaceholder")}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-[13px] font-bold text-ink">
        {t("handle")}
        <span className="flex h-12 items-center rounded-control border border-line-strong bg-surface px-3.5 focus-within:border-ink-2">
          <span className="text-base font-medium text-muted">@</span>
          <input
            value={shownHandle}
            onChange={(event) => {
              setHandleTouched(true);
              setHandle(event.target.value.toLowerCase());
            }}
            className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none"
            placeholder={t("handlePlaceholder")}
          />
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-[13px] font-bold text-ink">
        {t("breed")}
        <select key={species} className={field} defaultValue={BREEDS[species][0]}>
          {BREEDS[species].map((breed) => (
            <option key={breed} value={breed}>
              {t(`breeds.${breed}`)}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2.5">
        <label className="flex flex-col gap-1.5 text-[13px] font-bold text-ink">
          {t("birth")}
          <input type="month" className={`${field} min-w-0`} />
        </label>
        <fieldset className="flex flex-col">
          <legend className="mb-1.5 text-[13px] font-bold text-ink">{t("sex")}</legend>
          <div className="grid h-12 grid-cols-2 rounded-control bg-surface-2 p-[3px]">
            {(["female", "male"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={sex === value}
                onClick={() => setSex(value)}
                className={`rounded-[11px] text-sm ${sex === value ? "bg-surface font-bold text-ink shadow-sm" : "font-semibold text-ink-2"}`}
              >
                {tPets(`sex.${value}`)}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {error && (
        <p role="alert" className="text-[13px] font-semibold text-danger-ink">
          {t(error)}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <button
          type="submit"
          className="h-[52px] rounded-2xl bg-primary text-[15px] font-bold text-white hover:bg-primary-hover"
        >
          {t("continue")}
        </button>
        <p className="text-center text-xs text-muted">{t("laterNotice")}</p>
      </div>
    </form>
  );
}
