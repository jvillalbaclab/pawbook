"use client";

import { type CreatePetRequest, MAX_ACTIVE_PETS_PER_USER, type Pet } from "@pawbook/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useRef, useState } from "react";
import { ImageIcon } from "@/design-system/icons";
import {
  buildCreatePetRequest,
  createIdempotencyKeys,
  type HandleStatus,
  handleStatusError,
  mapCreatePetError,
  normalizeHandle,
  type PetField,
  type PetFormErrors,
} from "@/features/pets/create-pet";
import { createPet, myPetsQueryKey } from "@/features/pets/pets-api";
import { useHandleAvailability } from "@/features/pets/use-handle-availability";
import { activePetStore, useActivePetStore } from "@/stores/active-pet";
import { useAuthStore } from "@/stores/auth";
import { suggestHandle } from "./registration";

type Species = CreatePetRequest["species"];
type Sex = CreatePetRequest["sex"];

/** Razas frecuentes por especie (claves de "petStep.breeds"); "other" abre texto libre. */
const BREEDS = {
  cat: ["mixed", "european", "siamese", "persian", "maineCoon", "unknown", "other"],
  dog: ["mixed", "labrador", "borderCollie", "beagle", "poodle", "unknown", "other"],
} as const satisfies Record<Species, readonly string[]>;

type BreedKey = (typeof BREEDS)[Species][number];

const NO_ERRORS: PetFormErrors = { fields: {}, alert: null };

/** Primera mascota → paso 3 (a quién seguir). Una más → de vuelta al feed. */
const FOLLOW_STEP_PATH = "/registro/seguir";
const HOME_PATH = "/";

/**
 * Paso 2: presentar a la mascota (US-02, FR-PET-001/002). El @handle se sugiere a partir del
 * nombre hasta que se edita a mano y se comprueba su disponibilidad mientras se escribe. Al
 * crearla pasa a ser la mascota activa.
 *
 * Si el usuario ya tiene mascotas (vuelve atrás desde el paso 3 o llega desde "Añadir
 * mascota" del selector), el formulario sirve para añadir otra, con un aviso y la opción de
 * seguir sin crear nada: así volver atrás nunca obliga a duplicar la mascota.
 */
export function PetForm() {
  const t = useTranslations("petStep");
  const tPets = useTranslations("pets");
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const petsReady = useActivePetStore((state) => state.status === "ready");
  const existingPets = useActivePetStore((state) => state.pets);

  const [species, setSpecies] = useState<Species>("cat");
  const [sex, setSex] = useState<Sex>("female");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [breed, setBreed] = useState<BreedKey>("mixed");
  const [otherBreed, setOtherBreed] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [errors, setErrors] = useState<PetFormErrors>(NO_ERRORS);
  const idempotencyKeys = useRef(createIdempotencyKeys()).current;

  const shownHandle = handleTouched ? handle : suggestHandle(name, species);
  const availability = useHandleAvailability(normalizeHandle(shownHandle));
  const atLimit = existingPets.length >= MAX_ACTIVE_PETS_PER_USER;

  const mutation = useMutation({
    mutationFn: ({ request, key }: { request: CreatePetRequest; key: string }) =>
      createPet(request, key),
    onSuccess: (pet) => {
      const hadPets = activePetStore.getState().pets.length > 0;
      if (userId !== null) {
        activePetStore.getState().add(userId, pet);
        queryClient.setQueryData<Pet[]>(myPetsQueryKey(userId), (old) =>
          old === undefined ? old : [...old.filter((mine) => mine.id !== pet.id), pet],
        );
        void queryClient.invalidateQueries({ queryKey: myPetsQueryKey(userId) });
      }
      router.push(hadPets ? HOME_PATH : FOLLOW_STEP_PATH);
    },
    onError: (error) => setErrors(mapCreatePetError(error)),
  });

  function clearField(field: PetField) {
    setErrors((current) => {
      if (current.fields[field] === undefined && current.alert === null) return current;
      const { [field]: _removed, ...fields } = current.fields;
      return { fields, alert: null };
    });
  }

  function breedText(): string {
    if (breed === "other") return otherBreed;
    if (breed === "unknown") return "";
    return t(`breeds.${breed}`);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending || atLimit) return;
    const built = buildCreatePetRequest({
      name,
      handle: shownHandle,
      species,
      sex,
      breed: breedText(),
      birthMonth,
    });
    if (!built.ok) return setErrors(built.errors);
    const blocked =
      availability.kind !== "idle" && availability.handle === built.request.handle
        ? handleStatusError(availability)
        : null;
    if (blocked !== null) return setErrors({ fields: { handle: blocked }, alert: null });
    setErrors(NO_ERRORS);
    mutation.mutate({ request: built.request, key: idempotencyKeys.keyFor(built.request) });
  }

  const segment = (active: boolean) =>
    `h-14 rounded-2xl text-[15px] ${active ? "border-2 border-ink font-extrabold text-ink" : "border border-line-strong font-semibold text-ink-2"} bg-surface`;
  const field = (invalid: boolean) =>
    `h-12 rounded-control border bg-surface px-3.5 text-base text-ink outline-none focus:border-ink-2 ${invalid ? "border-danger-ink" : "border-line-strong"}`;
  const handleError = errors.fields.handle;
  const handleBorder =
    handleError !== undefined
      ? "border-danger-ink"
      : availability.kind === "available"
        ? "border-success"
        : "border-line-strong";

  return (
    <form noValidate onSubmit={submit} className="flex flex-1 flex-col gap-4">
      {petsReady && existingPets.length > 0 && (
        <p
          role="status"
          className="rounded-control border border-line bg-surface-2 px-3.5 py-2.5 text-[13px] text-ink-2"
        >
          {atLimit
            ? t("limitReached", { max: MAX_ACTIVE_PETS_PER_USER })
            : t("alreadyHasPets", { count: existingPets.length })}{" "}
          <Link href={FOLLOW_STEP_PATH} className="font-bold text-primary-ink underline">
            {t("skipAdding")}
          </Link>
        </p>
      )}

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
          {(["dog", "cat"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={species === value}
              onClick={() => {
                setSpecies(value);
                setBreed("mixed");
              }}
              className={segment(species === value)}
            >
              {tPets(`species.${value}`)}
            </button>
          ))}
        </fieldset>
      </div>

      <label className="flex flex-col gap-1.5 text-[13px] font-bold text-ink">
        {t("name")}
        <input
          name="name"
          value={name}
          maxLength={PET_NAME_INPUT_MAX}
          autoComplete="off"
          aria-invalid={errors.fields.name !== undefined}
          aria-describedby="pet-name-error"
          onChange={(event) => {
            setName(event.target.value);
            clearField("name");
            if (!handleTouched) clearField("handle");
          }}
          className={field(errors.fields.name !== undefined)}
          placeholder={t("namePlaceholder")}
        />
        <FieldError id="pet-name-error" error={errors.fields.name} />
      </label>

      <label className="flex flex-col gap-1.5 text-[13px] font-bold text-ink">
        {t("handle")}
        <span
          className={`flex h-12 items-center gap-2 rounded-control border bg-surface px-3.5 focus-within:border-ink-2 ${handleBorder}`}
        >
          <span className="text-base font-medium text-muted">@</span>
          <input
            name="handle"
            value={shownHandle}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={handleError !== undefined}
            aria-describedby="pet-handle-status pet-handle-error"
            onChange={(event) => {
              setHandleTouched(true);
              setHandle(event.target.value.replace(/^@/, "").toLowerCase());
              clearField("handle");
            }}
            className="min-w-0 flex-1 bg-transparent text-base font-normal text-ink outline-none"
            placeholder={t("handlePlaceholder")}
          />
          <HandleBadge status={availability} />
        </span>
        <FieldError id="pet-handle-error" error={handleError} />
      </label>

      <label className="flex flex-col gap-1.5 text-[13px] font-bold text-ink">
        {t("breed")}
        <select
          name="breed"
          value={breed}
          onChange={(event) => {
            setBreed(event.target.value as BreedKey);
            clearField("breed");
          }}
          className={field(errors.fields.breed !== undefined && breed !== "other")}
        >
          {BREEDS[species].map((key) => (
            <option key={key} value={key}>
              {t(`breeds.${key}`)}
            </option>
          ))}
        </select>
      </label>
      {breed === "other" && (
        <label className="-mt-2 flex flex-col gap-1.5 text-[13px] font-bold text-ink">
          <span className="sr-only">{t("otherBreed")}</span>
          <input
            name="otherBreed"
            value={otherBreed}
            maxLength={PET_SHORT_TEXT_INPUT_MAX}
            aria-invalid={errors.fields.breed !== undefined}
            aria-describedby="pet-breed-error"
            onChange={(event) => {
              setOtherBreed(event.target.value);
              clearField("breed");
            }}
            placeholder={t("otherBreed")}
            className={field(errors.fields.breed !== undefined)}
          />
        </label>
      )}
      <FieldError id="pet-breed-error" error={errors.fields.breed} />

      <div className="grid grid-cols-2 gap-2.5">
        <label className="flex flex-col gap-1.5 text-[13px] font-bold text-ink">
          {t("birth")}
          <input
            type="month"
            name="birthMonth"
            value={birthMonth}
            max={currentMonth()}
            aria-invalid={errors.fields.birthMonth !== undefined}
            aria-describedby="pet-birth-error"
            onChange={(event) => {
              setBirthMonth(event.target.value);
              clearField("birthMonth");
            }}
            className={`${field(errors.fields.birthMonth !== undefined)} min-w-0`}
          />
          <FieldError id="pet-birth-error" error={errors.fields.birthMonth} />
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

      {errors.alert && (
        <p
          role="alert"
          className="rounded-control border border-danger-ink/30 bg-danger-tint px-3.5 py-2.5 text-[13px] font-semibold text-danger-ink"
        >
          {t(`alerts.${errors.alert}`, { max: MAX_ACTIVE_PETS_PER_USER })}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <button
          type="submit"
          disabled={mutation.isPending || atLimit}
          aria-busy={mutation.isPending}
          className="h-[52px] rounded-2xl bg-primary text-[15px] font-bold text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {mutation.isPending ? t("creating") : t("continue")}
        </button>
        <p className="text-center text-xs text-muted">{t("laterNotice")}</p>
      </div>
    </form>
  );
}

/** Margen de 1 sobre el máximo: el error de longitud se ve en vez de cortar el texto. */
const PET_NAME_INPUT_MAX = 41;
const PET_SHORT_TEXT_INPUT_MAX = 61;

/** `AAAA-MM` del mes actual (tope del selector de nacimiento). */
function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function FieldError({ id, error }: { id: string; error: PetFormErrors["fields"][PetField] }) {
  const t = useTranslations("petStep");
  return (
    <span id={id} className="text-[13px] font-semibold text-danger-ink">
      {error ? t(`errors.${error}`) : null}
    </span>
  );
}

/** Estado del @handle dentro del campo, como en el diseño ("Disponible"). */
function HandleBadge({ status }: { status: HandleStatus }) {
  const t = useTranslations("petStep");
  const tone: Record<HandleStatus["kind"], string> = {
    idle: "",
    unknown: "",
    checking: "text-muted",
    available: "text-success-ink",
    taken: "text-danger-ink",
    reserved: "text-danger-ink",
    invalid: "text-danger-ink",
  };
  const { kind } = status;
  return (
    <span
      id="pet-handle-status"
      aria-live="polite"
      className={`shrink-0 text-xs font-bold ${tone[kind]}`}
    >
      {kind === "idle" || kind === "unknown" ? null : t(`handleStatus.${kind}`)}
    </span>
  );
}
