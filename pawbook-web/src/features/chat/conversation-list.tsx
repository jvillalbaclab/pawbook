"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/design-system/avatar";
import { getConversations } from "@/lib/api";
import type { Conversation } from "@/lib/types";

const TABS: { id: Conversation["kind"]; label: string }[] = [
  { id: "pawmates", label: "PawMates" },
  { id: "adoption", label: "Adopción" },
];

/** selectedId lo decide MessagesShell, que ya lee el segmento de la ruta. */
export function ConversationList({ selectedId }: { selectedId: string | null }) {
  const conversations = useQuery({ queryKey: ["conversations"], queryFn: getConversations });
  const [kind, setKind] = useState<Conversation["kind"]>("pawmates");
  const visible = conversations.data?.filter((conversation) => conversation.kind === kind) ?? [];

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 px-4 pt-1 pb-3 lg:px-5 lg:pt-5">
        <h1 className="font-display text-2xl font-extrabold text-ink">Mensajes</h1>
        <div role="tablist" aria-label="Tipo de conversación" className="flex gap-1.5">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={kind === id}
              onClick={() => setKind(id)}
              className={`h-9 rounded-full px-3.5 text-[13px] ${
                kind === id
                  ? "bg-inverse font-bold text-on-inverse"
                  : "border border-line bg-surface font-semibold text-ink-2"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {conversations.isPending && (
        <p className="px-5 py-6 text-sm text-muted">Cargando conversaciones…</p>
      )}

      {conversations.isSuccess && visible.length === 0 && (
        <p className="px-5 py-6 text-sm text-muted">
          {kind === "pawmates"
            ? "Aún no tienes matches. Cuando otra mascota también marque interés, podréis chatear aquí."
            : "Aquí aparecerán tus solicitudes de adopción."}
        </p>
      )}

      <ul>
        {visible.map((conversation) => {
          const active = conversation.id === selectedId;
          return (
            <li key={conversation.id}>
              <Link
                href={`/mensajes/${conversation.id}`}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 border-l-[3px] px-4 py-3 lg:px-5 ${
                  active
                    ? "border-primary bg-primary-tint"
                    : "border-transparent hover:bg-surface-2"
                }`}
              >
                <Avatar
                  name={conversation.pet.name}
                  tone={conversation.pet.tone}
                  size={46}
                  online={conversation.online}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <span className="truncate text-[15px] font-bold text-ink">
                      {conversation.pet.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted">{conversation.timeLabel}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`flex-1 truncate text-[13px] ${
                        conversation.typing
                          ? "font-semibold text-success-ink"
                          : conversation.unread
                            ? "font-semibold text-ink"
                            : "text-muted"
                      }`}
                    >
                      {conversation.typing ? "escribiendo…" : conversation.lastMessage}
                    </span>
                    {conversation.unread && (
                      <span className="size-2.5 shrink-0 rounded-full bg-primary">
                        <span className="sr-only">Sin leer</span>
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mx-4 mt-3 rounded-[14px] bg-canvas p-3 text-xs leading-relaxed text-muted lg:mx-5">
        Solo puedes chatear con mascotas con las que tienes match. Puedes bloquear o denunciar desde
        cada conversación.
      </p>
    </div>
  );
}
