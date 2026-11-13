import type { Metadata } from "next";
import { MessagesShell } from "@/features/chat/messages-shell";

export const metadata: Metadata = { title: "Mensajes" };

export default function MessagesLayout({ children }: LayoutProps<"/mensajes">) {
  return <MessagesShell>{children}</MessagesShell>;
}
