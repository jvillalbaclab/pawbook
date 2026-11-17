"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Avatar } from "@/design-system/avatar";
import { MessageIcon } from "@/design-system/icons";
import { ErrorState, ListItemSkeleton, LoadingState } from "@/design-system/states";
import { TimeLabel } from "@/design-system/time-label";
import { getConversations } from "@/lib/api";
import type { Conversation } from "@/lib/types";

const KINDS: Conversation["kind"][] = ["pawmates", "adoption"];

/** selectedId lo decide MessagesShell, que ya lee el segmento de la ruta. */
export function ConversationList({ selectedId }: { selectedId: string | null }) {
  const t = useTranslations("chat");
  const conversations = useQuery({ queryKey: ["conversations"], queryFn: getConversations });
  const [kind, setKind] = useState<Conversation["kind"]>("pawmates");
  const visible = conversations.data?.filter((conversation) => conversation.kind === kind) ?? [];

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 px-4 pt-1 pb-3 lg:px-5 lg:pt-5">
        <h1 className="font-display text-2xl font-extrabold text-ink">{t("title")}</h1>
        <div role="tablist" aria-label={t("kindLabel")} className="flex gap-1.5">
          {KINDS.map((id) => (
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
              {t(`kind.${id}`)}
            </button>
          ))}
        </div>
      </div>

      {conversations.isPending && (
        <LoadingState label={t("loadingList")} className="flex flex-col">
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </LoadingState>
      )}

      {conversations.isError && (
        <ErrorState
          icon={<MessageIcon size={40} />}
          title={t("listErrorTitle")}
          onRetry={() => conversations.refetch()}
        />
      )}

      {conversations.isSuccess && visible.length === 0 && (
        <p className="px-5 py-6 text-sm text-muted">{t(`empty.${kind}`)}</p>
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
                    <TimeLabel
                      date={conversation.lastMessageAt}
                      variant="conversation"
                      className="shrink-0 text-xs text-muted"
                    />
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
                      {conversation.typing ? t("typing") : conversation.lastMessage}
                    </span>
                    {conversation.unread && (
                      <span className="size-2.5 shrink-0 rounded-full bg-primary">
                        <span className="sr-only">{t("unread")}</span>
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mx-4 mt-3 rounded-control bg-canvas p-3 text-xs leading-relaxed text-muted lg:mx-5">
        {t("safetyNotice")}
      </p>
    </div>
  );
}
