import { Suspense } from "react";
import { ChatView } from "@/features/chat/chat-view";
import { CONVERSATIONS } from "@/lib/sample-data";

/** Prerenderiza las conversaciones de ejemplo; con la API real serán siempre dinámicas. */
export function generateStaticParams() {
  return CONVERSATIONS.map((conversation) => ({ channelId: conversation.id }));
}

export default function ConversationPage(props: PageProps<"/mensajes/[channelId]">) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted">Cargando conversación…</p>}>
      <Conversation params={props.params} />
    </Suspense>
  );
}

async function Conversation({ params }: { params: Promise<{ channelId: string }> }) {
  const { channelId } = await params;
  return <ChatView conversationId={channelId} />;
}
