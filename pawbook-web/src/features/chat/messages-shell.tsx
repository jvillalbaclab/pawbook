"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import { ConversationList } from "./conversation-list";

/**
 * En móvil se ve la lista o el chat abierto, nunca los dos. En desktop, lado a lado.
 * El segmento seleccionado indica si hay una conversación abierta; mientras no se
 * conoce (Cache Components lo suspende en params dinámicos) se muestra la lista.
 */
export function MessagesShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<MessagesFrame openConversation={null}>{children}</MessagesFrame>}>
      <MessagesShellWithSegment>{children}</MessagesShellWithSegment>
    </Suspense>
  );
}

function MessagesShellWithSegment({ children }: { children: ReactNode }) {
  return <MessagesFrame openConversation={useSelectedLayoutSegment()}>{children}</MessagesFrame>;
}

function MessagesFrame({
  openConversation,
  children,
}: {
  openConversation: string | null;
  children: ReactNode;
}) {
  return (
    <div className="-mx-4 flex overflow-hidden border-line bg-surface lg:mx-0 lg:h-[calc(100dvh-48px)] lg:rounded-[24px] lg:border">
      <section
        aria-label="Conversaciones"
        className={`w-full shrink-0 overflow-y-auto border-line lg:block lg:w-[320px] lg:border-r ${
          openConversation ? "hidden" : "block"
        }`}
      >
        <ConversationList selectedId={openConversation} />
      </section>
      <div className={`min-w-0 flex-1 ${openConversation ? "flex" : "hidden lg:flex"}`}>
        {children}
      </div>
    </div>
  );
}
