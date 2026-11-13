import Link from "next/link";

export default function PetNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <p
        aria-hidden="true"
        className="font-display text-6xl font-extrabold tracking-tighter text-line-strong"
      >
        404
      </p>
      <h1 className="font-display text-xl font-extrabold text-ink">
        Esta mascota no está por aquí
      </h1>
      <p className="max-w-sm text-[15px] text-ink-2">
        El perfil no existe o su responsable lo ha archivado.
      </p>
      <Link
        href="/"
        className="mt-2 flex h-12 items-center rounded-2xl bg-inverse px-6 text-[15px] font-bold text-on-inverse"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
