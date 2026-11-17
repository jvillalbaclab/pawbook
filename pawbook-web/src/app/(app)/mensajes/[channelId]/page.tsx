import { Suspense } from "react";
import { ChatView } from "@/features/chat/chat-view";
import { getConversations } from "@/lib/api";

/** Prerenderiza las conversaciones de ejemplo; con la API real serán siempre dinámicas. */
export async function generateStaticParams() {
  const conversations = await getConversations();
  return conversations.map((conversation) => ({ channelId: conversation.id }));
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
