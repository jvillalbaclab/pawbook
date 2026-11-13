"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/design-system/avatar";
import { ChevronLeftIcon, ImageIcon, MoreIcon, SendIcon } from "@/design-system/icons";
import { Photo } from "@/design-system/photo";
import { getConversation } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";
import { appendMessage, MAX_MESSAGE_LENGTH } from "./messages";

const STATUS_LABEL = { sent: "Enviado", delivered: "Entregado", read: "Leído" };

/**
 * Chat 1:1. Los mensajes nuevos viven en estado local: el tiempo real llegará con
 * stream-chat-react (arquitectura §6.1), que sustituye este componente por dentro.
 */
export function ChatView({ conversationId }: { conversationId: string }) {
  const conversation = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => getConversation(conversationId),
  });
  const [sent, setSent] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const endRef = useRef<HTMLDivElement>(null);

  // Lleva la vista al último mensaje al abrir o enviar.
  const messageCount = (conversation.data?.messages.length ?? 0) + sent.length;
  useEffect(() => {
    if (messageCount > 0) endRef.current?.scrollIntoView({ block: "end" });
  }, [messageCount]);

  if (conversation.isPending)
    return <p className="p-6 text-sm text-muted">Cargando conversación…</p>;
  if (!conversation.data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="font-display text-lg font-extrabold text-ink">Conversación no encontrada</p>
        <Link href="/mensajes" className="text-sm font-bold text-primary-ink">
          Volver a mensajes
        </Link>
      </div>
    );
  }

  const chat = conversation.data;
  const messages = [...chat.messages, ...sent];

  function send(event: FormEvent) {
    event.preventDefault();
    const now = new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
    setSent((current) => {
      const next = appendMessage(
        [...chat.messages, ...current],
        draft,
        `local-${current.length}`,
        now,
      );
      return next.slice(chat.messages.length);
    });
    setDraft("");
  }

  return (
    <div className="flex h-[calc(100dvh-140px)] flex-1 flex-col lg:h-auto">
      <header className="flex items-center gap-2.5 border-b border-line bg-surface px-2 py-2.5 lg:px-5">
        <Link
          href="/mensajes"
          aria-label="Volver a mensajes"
          className="flex size-11 items-center justify-center rounded-xl text-ink lg:hidden"
        >
          <ChevronLeftIcon size={22} />
        </Link>
        <Avatar name={chat.pet.name} tone={chat.pet.tone} size={42} online={chat.online} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold text-ink">
            {chat.pet.name}{" "}
            <span className="font-sans text-[13px] font-medium text-muted">
              · {chat.pet.breed}
              {chat.distanceLabel ? ` · ${chat.distanceLabel}` : ""}
            </span>
          </p>
          <p className={`text-xs font-semibold ${chat.typing ? "text-success-ink" : "text-muted"}`}>
            {chat.typing ? "escribiendo…" : chat.online ? "En línea" : "Desconectado"}
          </p>
        </div>
        <button
          type="button"
          aria-label="Opciones: ver perfil, bloquear o denunciar"
          className="flex size-10 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-2"
        >
          <MoreIcon />
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-canvas p-4 lg:p-6">
        {chat.kind === "pawmates" && (
          <p className="self-center rounded-[14px] border border-primary-line bg-primary-tint px-4 py-2 text-center text-[13px] font-semibold text-primary-ink">
            {chat.myPetName} y {chat.pet.name} hicieron match · Quedad en sitios públicos
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[76%] overflow-hidden text-sm leading-snug lg:max-w-[60%] ${
              message.fromMe
                ? "self-end rounded-[18px_18px_6px_18px] bg-inverse text-on-inverse"
                : "self-start rounded-[18px_18px_18px_6px] border border-line bg-surface text-ink"
            }`}
          >
            {message.photo && (
              <Photo
                tone={message.photo.tone}
                alt={message.photo.alt}
                className="h-40 w-60"
                showPaw={false}
              />
            )}
            <div className="px-3.5 py-2.5">
              {message.text}
              <p
                className={`mt-1 text-[11px] ${message.fromMe ? "text-right opacity-75" : "text-muted"}`}
              >
                {message.timeLabel}
                {message.status ? ` · ${STATUS_LABEL[message.status]}` : ""}
              </p>
            </div>
          </div>
        ))}
        {chat.typing && (
          <div
            role="status"
            aria-label={`${chat.pet.name} está escribiendo`}
            className="flex gap-1 self-start rounded-[18px] border border-line bg-surface px-3.5 py-3"
          >
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                className="size-[7px] animate-pulse rounded-full bg-line-strong"
                style={{ animationDelay: `${dot * 150}ms` }}
              />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={send}
        className="flex items-center gap-2 border-t border-line bg-surface px-3 py-2.5 lg:px-5"
      >
        <button
          type="button"
          aria-label="Enviar imagen"
          className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-surface-2 text-ink-2"
        >
          <ImageIcon size={20} />
        </button>
        <label htmlFor={inputId} className="sr-only">
          Mensaje
        </label>
        <input
          id={inputId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={`Escribe como ${chat.myPetName}…`}
          className="h-11 min-w-0 flex-1 rounded-full border border-line bg-canvas px-4 text-[15px] text-ink outline-none placeholder:text-muted focus:border-line-strong"
        />
        <button
          type="submit"
          aria-label="Enviar"
          disabled={!draft.trim()}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50"
        >
          <SendIcon size={20} />
        </button>
      </form>
    </div>
  );
}
