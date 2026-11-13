import type { Metadata } from "next";
import Link from "next/link";
import { AdoptionIcon, ImageIcon, PawIcon } from "@/design-system/icons";
import { Logo } from "@/design-system/logo";
import { RegistrationForm } from "@/features/auth/registration-form";

export const metadata: Metadata = { title: "Crea tu cuenta" };

const PILLARS = [
  {
    icon: ImageIcon,
    title: "Un perfil para cada mascota",
    text: "Publica fotos y deja que ella firme lo que comparte.",
  },
  {
    icon: PawIcon,
    title: "PawMates cerca de ti",
    text: "Compañeros de paseo compatibles, sin revelar tu ubicación exacta.",
  },
  {
    icon: AdoptionIcon,
    title: "Adopción responsable",
    text: "Solo refugios y fundaciones verificadas.",
  },
];

export default function RegistrationPage() {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Panel de marca: siempre oscuro, en los dos temas. */}
      <section className="hidden flex-1 flex-col gap-9 bg-stone-900 px-14 py-12 text-stone-50 lg:flex">
        <Logo />
        <div className="max-w-[520px]">
          <h1 className="font-display text-[46px] leading-[1.06] font-extrabold tracking-tight">
            La red social donde tu mascota es la protagonista
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-stone-300">
            Un espacio solo para perros y gatos, sin perderse entre todo lo demás.
          </p>
        </div>
        <ul className="flex max-w-[480px] flex-col gap-4">
          {PILLARS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#3a2620] text-[#ff8a6b]">
                <Icon size={22} />
              </span>
              <span>
                <span className="block font-bold">{title}</span>
                <span className="mt-0.5 block text-sm text-stone-300">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-8 lg:px-8">
        <div className="flex w-full max-w-[420px] flex-col gap-5">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div>
            <h2 className="font-display text-[28px] font-extrabold tracking-tight text-ink lg:text-[30px]">
              <span className="lg:hidden">La red social donde tu mascota es la protagonista</span>
              <span className="hidden lg:inline">Crea tu cuenta</span>
            </h2>
            <p className="mt-1.5 text-[15px] text-ink-2">
              Después presentarás a tu primera mascota.
            </p>
          </div>
          <RegistrationForm />
          <p className="border-t border-line pt-3 text-center text-sm text-ink-2">
            ¿Ya tienes cuenta?{" "}
            <Link href="/" className="font-bold text-primary-ink">
              Inicia sesión
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
