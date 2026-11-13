"use client";

import { useState } from "react";
import { Avatar } from "@/design-system/avatar";
import { ImageIcon, PinIcon, SparklesIcon } from "@/design-system/icons";
import type { Pet } from "@/lib/types";
import { MAX_POST_LENGTH, validatePostText } from "../post-validation";

/**
 * Caja de publicar. Todavía no publica: no hay API ni subida de fotos. Por honestidad
 * el botón lo dice en vez de fingir que funciona (principio "nada simulado").
 */
export function Composer({ activePet }: { activePet: Pick<Pet, "name" | "tone"> }) {
  const [text, setText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const error = validatePostText(text);

  return (
    <section
      id="publicar"
      aria-label="Nueva publicación"
      className="scroll-mt-24 rounded-[22px] border border-line bg-surface p-4"
    >
      <div className="flex gap-3">
        <Avatar name={activePet.name} tone={activePet.tone} size={44} />
        <label className="flex-1">
          <span className="sr-only">Texto de la publicación</span>
          <textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setNotice(null);
            }}
            rows={2}
            placeholder={`¿Qué hizo ${activePet.name} hoy?`}
            className="w-full resize-none bg-transparent py-2.5 text-base text-ink outline-none placeholder:text-muted"
          />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-line-soft pt-3">
        <button
          type="button"
          className="flex h-[38px] items-center gap-1.5 rounded-xl bg-surface-2 px-3 text-[13px] font-semibold text-ink-2"
        >
          <ImageIcon size={17} />
          Fotos
        </button>
        <button
          type="button"
          className="flex h-[38px] items-center gap-1.5 rounded-xl bg-surface-2 px-3 text-[13px] font-semibold text-ink-2"
        >
          <PinIcon size={17} />
          Ubicación
        </button>
        <button
          type="button"
          className="flex h-[38px] items-center gap-1.5 rounded-xl border border-ai-line bg-ai-tint px-3 text-[13px] font-bold text-ai-ink"
        >
          <SparklesIcon size={17} />
          Sugerir pie con IA
        </button>
        <span
          className={`ml-auto text-xs tabular-nums ${error ? "text-danger-ink" : "text-muted"}`}
        >
          {text.length}/{MAX_POST_LENGTH}
        </span>
        <button
          type="button"
          disabled={text.trim().length === 0 || error !== null}
          onClick={() => setNotice("Publicar estará disponible cuando conectemos la API.")}
          className="h-10 rounded-[14px] bg-primary px-5 text-sm font-bold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Publicar
        </button>
      </div>
      {(error || notice) && (
        <p role="status" className={`mt-2 text-sm ${error ? "text-danger-ink" : "text-muted"}`}>
          {error ?? notice}
        </p>
      )}
    </section>
  );
}
