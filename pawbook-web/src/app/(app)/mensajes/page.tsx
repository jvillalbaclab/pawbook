import { MessageIcon } from "@/design-system/icons";

/** Solo se ve en desktop, cuando no hay conversación abierta. */
export default function MessagesIndexPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-primary-tint text-primary-ink">
        <MessageIcon size={34} />
      </span>
      <p className="font-display text-lg font-extrabold text-ink">Elige una conversación</p>
      <p className="max-w-xs text-sm text-muted">
        Tus matches de PawMates y tus solicitudes de adopción aparecen a la izquierda.
      </p>
    </div>
  );
}
