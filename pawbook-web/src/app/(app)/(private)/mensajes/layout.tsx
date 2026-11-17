import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MessagesShell } from "@/features/chat/messages-shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("chat");
  return { title: t("title") };
}

export default function MessagesLayout({ children }: LayoutProps<"/mensajes">) {
  return <MessagesShell>{children}</MessagesShell>;
}
